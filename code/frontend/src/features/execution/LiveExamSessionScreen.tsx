import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import {
  Shield,
  Clock,
  ChevronRight,
  Wifi,
  WifiOff,
  AlertTriangle,
  Loader2,
  SkipForward,
  CheckCircle2,
} from "lucide-react";
import {
  useStartSessionMutation,
  useSubmitQuestionMutation,
  useSkipQuestionMutation,
  useSubmitExamMutation,
  useHeartbeatMutation,
  type SessionProjection,
} from "@/redux/services/sessionApi";
import { useSendTelemetryMutation } from "@/redux/services/proctoringApi";
import { nativeBridge } from "@/native-bridge/electronBridge";

export const LiveExamSessionScreen: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const targetExamId = examId || "";

  // Redux Mutations
  const [startSession, { isLoading: isStarting }] = useStartSessionMutation();
  const [submitQuestion, { isLoading: isSubmittingQuestion }] = useSubmitQuestionMutation();
  const [skipQuestion, { isLoading: isSkippingQuestion }] = useSkipQuestionMutation();
  const [submitExam, { isLoading: isSubmittingExam }] = useSubmitExamMutation();
  const [heartbeat] = useHeartbeatMutation();
  const [sendTelemetry] = useSendTelemetryMutation();

  // Active Session State
  const [session, setSession] = useState<SessionProjection | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<any>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isFinalSubmitModalOpen, setIsFinalSubmitModalOpen] = useState(false);

  // Telemetry queue
  const telemetryQueueRef = useRef<Array<{ eventId: string; eventType: string; occurredAtClientMs: number; metadata: any }>>([]);

  // Authoritative countdown in seconds
  const [paperSecondsRemaining, setPaperSecondsRemaining] = useState<number>(0);
  const [sectionSecondsRemaining, setSectionSecondsRemaining] = useState<number | null>(null);
  const [questionSecondsRemaining, setQuestionSecondsRemaining] = useState<number | null>(null);

  const sessionRef = useRef<SessionProjection | null>(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const isSubmittingAction = isSubmittingQuestion || isSkippingQuestion || isSubmittingExam;

  // Initialize Session on Mount
  useEffect(() => {
    if (!targetExamId) return;

    const storedEntryToken =
      localStorage.getItem(`entryToken_${targetExamId}`) ||
      searchParams.get("entryToken") ||
      "";

    const init = async () => {
      try {
        setErrorMessage(null);
        const res: any = await startSession({
          examId: targetExamId,
          entryToken: storedEntryToken,
        }).unwrap();

        const projection = res?.data !== undefined ? res.data : res;
        if (!projection) {
          throw new Error("Invalid session response received from server.");
        }

        setSession(projection);

        if (projection.isComplete) {
          if (projection.status === "TERMINATED") {
            navigate(`/exam/${targetExamId}/terminated`);
          } else {
            navigate(`/exam/${targetExamId}/submitted`);
          }
        }
      } catch (err: any) {
        console.error("Failed to start or resume session:", err);
        const msg =
          err.data?.error?.message ||
          err.data?.message ||
          err.message ||
          "Failed to start exam session. Please ensure all security gates passed.";
        setErrorMessage(msg);
      }
    };

    init();
  }, [targetExamId, startSession, searchParams, navigate]);

  // Sync Server Deadlines with Timers
  useEffect(() => {
    if (!session) return;

    const computeRemaining = () => {
      const now = Date.now();
      if (session.paperDeadline) {
        const pSec = Math.max(0, Math.floor((new Date(session.paperDeadline).getTime() - now) / 1000));
        setPaperSecondsRemaining(pSec);
      }
      if (session.sectionDeadline) {
        const sSec = Math.max(0, Math.floor((new Date(session.sectionDeadline).getTime() - now) / 1000));
        setSectionSecondsRemaining(sSec);
      } else {
        setSectionSecondsRemaining(null);
      }
      if (session.questionDeadline) {
        const qSec = Math.max(0, Math.floor((new Date(session.questionDeadline).getTime() - now) / 1000));
        setQuestionSecondsRemaining(qSec);
      } else {
        setQuestionSecondsRemaining(null);
      }
    };

    computeRemaining();
  }, [session]);

  // Master 1-second Local Countdown Clock
  useEffect(() => {
    if (!session || session.isComplete) return;

    const interval = setInterval(() => {
      setPaperSecondsRemaining((prev) => {
        if (prev <= 1) {
          handleAutoSubmitPaper();
          return 0;
        }
        return prev - 1;
      });

      setSectionSecondsRemaining((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          handleAutoTimeoutQuestion();
          return 0;
        }
        return prev - 1;
      });

      setQuestionSecondsRemaining((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          handleAutoTimeoutQuestion();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  // Periodic Heartbeat every 15 seconds
  useEffect(() => {
    if (!session?.sessionId || session.isComplete) return;

    const hbInterval = setInterval(async () => {
      try {
        const res = await heartbeat(session.sessionId).unwrap();
        if (res.status && res.status !== session.status) {
          if (res.status === "TERMINATED") {
            navigate(`/exam/${targetExamId}/terminated`);
          } else if (res.status === "SUBMITTED" || res.status === "AUTO_SUBMITTED") {
            navigate(`/exam/${targetExamId}/submitted`);
          }
        }
      } catch (err) {
        console.warn("Heartbeat error:", err);
      }
    }, 15000);

    return () => clearInterval(hbInterval);
  }, [session?.sessionId, session?.isComplete, session?.status, heartbeat, targetExamId, navigate]);

  // Security Event Recorder & Immediate / Periodic Dispatcher
  const recordSecurityEvent = useCallback(
    (eventType: string, metadata: any = {}) => {
      const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const event = {
        eventId,
        eventType,
        occurredAtClientMs: Date.now(),
        metadata,
      };
      telemetryQueueRef.current.push(event);

      const currentSession = sessionRef.current;
      // Flush immediately on severe events
      if (
        currentSession?.sessionId &&
        (eventType === "MULTIPLE_DISPLAYS" ||
          eventType === "FULLSCREEN_EXIT" ||
          eventType === "FORBIDDEN_KEYSTROKE")
      ) {
        sendTelemetry({
          sessionId: currentSession.sessionId,
          clientSequence: currentSession.clientSequence,
          events: [event],
        }).catch((e) => console.warn("Immediate telemetry flush warning:", e));
      }
    },
    [sendTelemetry]
  );

  // Periodic Telemetry Batch Flush (Every 5 seconds)
  useEffect(() => {
    if (!session?.sessionId || session.isComplete) return;

    const flushInterval = setInterval(() => {
      if (telemetryQueueRef.current.length === 0) return;

      const batch = [...telemetryQueueRef.current];
      telemetryQueueRef.current = [];

      sendTelemetry({
        sessionId: session.sessionId,
        clientSequence: session.clientSequence,
        events: batch,
      }).catch((err) => {
        console.warn("Telemetry batch send warning:", err);
        telemetryQueueRef.current.unshift(...batch);
      });
    }, 5000);

    return () => clearInterval(flushInterval);
  }, [session?.sessionId, session?.clientSequence, session?.isComplete, sendTelemetry]);

  // Native & Browser Security Listeners (Lockdown Events)
  useEffect(() => {
    if (!session?.sessionId || session.isComplete) return;

    // 1. Electron Native Violations
    const unsubscribeNative = nativeBridge.onSecurityViolation?.((violation) => {
      recordSecurityEvent(violation.type, { details: violation.details });
    });

    // 2. Tab Blur & Focus Loss
    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordSecurityEvent("TAB_BLUR", { details: "Exam window hidden or switched to background." });
      }
    };

    const handleWindowBlur = () => {
      recordSecurityEvent("FOCUS_LOST", { details: "Window lost focus / task switch attempted." });
    };

    // 3. Fullscreen Exit
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !nativeBridge.isElectron) {
        recordSecurityEvent("FULLSCREEN_EXIT", { details: "Candidate exited fullscreen exam environment." });
      }
    };

    // 4. Clipboard & Context Menu Interception
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      recordSecurityEvent("COPY_ATTEMPT", { details: "Clipboard copy attempt intercepted." });
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      recordSecurityEvent("CONTEXT_MENU", { details: "Right-click context menu intercepted." });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      if (unsubscribeNative) unsubscribeNative();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [session?.sessionId, session?.isComplete, recordSecurityEvent]);

  // Network Online / Offline Listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      if (session?.sessionId) {
        navigate(`/exam/${targetExamId}/reconnect?sessionId=${session.sessionId}`);
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [session?.sessionId, targetExamId, navigate]);

  // Auto-submit when paper timer expires
  const handleAutoSubmitPaper = useCallback(async () => {
    if (!session?.sessionId || session.isComplete) return;
    try {
      const rawRes: any = await submitExam(session.sessionId).unwrap();
      const res: SessionProjection = rawRes?.data !== undefined ? rawRes.data : rawRes;
      setSession(res);
      navigate(`/exam/${targetExamId}/submitted`);
    } catch (e) {
      navigate(`/exam/${targetExamId}/submitted`);
    }
  }, [session, submitExam, targetExamId, navigate]);

  // Auto-timeout for question / section timer
  const handleAutoTimeoutQuestion = useCallback(async () => {
    if (!session?.currentQuestion || isSubmittingAction) return;
    try {
      const rawRes: any = await submitQuestion({
        sessionId: session.sessionId,
        examQuestionId: session.currentQuestion.id,
        answer: selectedAnswer || null,
        clientSequence: session.clientSequence,
      }).unwrap();
      const res: SessionProjection = rawRes?.data !== undefined ? rawRes.data : rawRes;

      setSession(res);
      setSelectedAnswer(null);

      if (res?.isComplete) {
        navigate(`/exam/${targetExamId}/submitted`);
      }
    } catch (err) {
      console.warn("Auto-timeout question submit error:", err);
    }
  }, [session, selectedAnswer, isSubmittingAction, submitQuestion, targetExamId, navigate]);

  // User Action: Submit Question and Advance Forward
  const handleSubmitCurrentQuestion = async () => {
    if (!session?.currentQuestion || !session.sessionId || isSubmittingAction) return;

    try {
      setErrorMessage(null);
      const rawRes: any = await submitQuestion({
        sessionId: session.sessionId,
        examQuestionId: session.currentQuestion.id,
        answer: selectedAnswer,
        clientSequence: session.clientSequence,
      }).unwrap();
      const res: SessionProjection = rawRes?.data !== undefined ? rawRes.data : rawRes;

      setSession(res);
      setSelectedAnswer(null);

      if (res?.isComplete) {
        navigate(`/exam/${targetExamId}/submitted`);
      }
    } catch (err: any) {
      console.error("Submit question error:", err);
      const msg = err.data?.error?.message || err.data?.message || err.message || "Failed to submit answer.";
      setErrorMessage(msg);
    }
  };

  // User Action: Skip Current Question
  const handleSkipCurrentQuestion = async () => {
    if (!session?.currentQuestion || !session.sessionId || isSubmittingAction) return;

    try {
      setErrorMessage(null);
      const rawRes: any = await skipQuestion({
        sessionId: session.sessionId,
        examQuestionId: session.currentQuestion.id,
        clientSequence: session.clientSequence,
      }).unwrap();
      const res: SessionProjection = rawRes?.data !== undefined ? rawRes.data : rawRes;

      setSession(res);
      setSelectedAnswer(null);

      if (res?.isComplete) {
        navigate(`/exam/${targetExamId}/submitted`);
      }
    } catch (err: any) {
      console.error("Skip question error:", err);
      const msg = err.data?.error?.message || err.data?.message || err.message || "Failed to skip question.";
      setErrorMessage(msg);
    }
  };

  // User Action: Submit Whole Exam
  const handleFinalExamSubmit = async () => {
    if (!session?.sessionId || isSubmittingAction) return;

    try {
      setErrorMessage(null);

      // If there is an active current question, submit its answer first
      if (session.currentQuestion) {
        const rawRes: any = await submitQuestion({
          sessionId: session.sessionId,
          examQuestionId: session.currentQuestion.id,
          answer: selectedAnswer !== undefined ? selectedAnswer : null,
          clientSequence: session.clientSequence,
        }).unwrap();

        const res: SessionProjection = rawRes?.data !== undefined ? rawRes.data : rawRes;
        setSelectedAnswer(null);

        if (res?.isComplete) {
          setSession(res);
          setIsFinalSubmitModalOpen(false);
          navigate(`/exam/${targetExamId}/submitted`);
          return;
        }
      }

      const res = await submitExam(session.sessionId).unwrap();
      setSession(res);
      setIsFinalSubmitModalOpen(false);
      navigate(`/exam/${targetExamId}/submitted`);
    } catch (err: any) {
      console.error("Final submit error:", err);
      setIsFinalSubmitModalOpen(false);
      navigate(`/exam/${targetExamId}/submitted`);
    }
  };

  // Format Timer Strings
  const formatSeconds = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Current Question helper
  const currentQ = session?.currentQuestion;
  const isLastQuestion =
    session && session.totalQuestions > 0 && session.currentQuestionIndex === session.totalQuestions - 1;

  if (isStarting) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 select-none font-sans">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-[#4C70A6] animate-spin" />
          <h2 className="text-base font-bold text-slate-100">Initializing Exam Session...</h2>
          <p className="text-xs text-slate-400 font-mono">
            Verifying cryptographic entry token and synchronizing server time...
          </p>
        </div>
      </div>
    );
  }

  if (errorMessage && !session) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 select-none font-sans">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-md p-8 text-center flex flex-col items-center gap-5 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-red-900/50 text-red-400 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Session Initialization Failed</h1>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">{errorMessage}</p>
          </div>
          <Button
            variant="primary"
            size="md"
            className="w-full bg-[#4C70A6] hover:bg-[#3F5E8E]"
            onClick={() => navigate(`/session/entry?examId=${targetExamId}`)}
          >
            Return to Security Gates
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans select-none">
      {/* Enterprise Dark Header Bar */}
      <header className="h-14 bg-slate-900 text-white px-6 flex items-center justify-between shadow-md z-40 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#4C70A6] flex items-center justify-center text-white shadow-2xs">
            <Shield className="w-5 h-5" />
          </div>

          <div>
            <div className="font-bold text-sm text-white tracking-tight leading-none">
              {session?.examTitle || "Examination Session"}
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              Secure Assessment Shell • {session?.timingMode ? session.timingMode.replace("_", " ") : "STANDARD"}
            </div>
          </div>
        </div>

        {/* Header Right: Connection & Authoritative Countdown */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5 text-xs font-mono">
            {isOnline ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <Wifi className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Connected</span>
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1">
                <WifiOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Offline</span>
              </span>
            )}
          </div>

          {/* Question / Section Timer if active */}
          {questionSecondsRemaining !== null && (
            <div className="bg-amber-950/80 border border-amber-800 text-amber-300 px-3 py-1 rounded text-xs font-mono font-bold flex items-center gap-1.5 shadow-inner">
              <Clock className="w-3.5 h-3.5" />
              <span>Q-Timer: {questionSecondsRemaining}s</span>
            </div>
          )}

          {/* Paper Deadline Clock */}
          <div className="bg-slate-800 border border-slate-700 px-3.5 py-1.5 rounded-md flex items-center gap-2 text-sm font-mono font-bold text-[#38BDF8] shadow-inner">
            <Clock className="w-4 h-4 text-[#38BDF8]" />
            <span>{formatSeconds(paperSecondsRemaining)}</span>
          </div>

          <Button
            variant="secondary"
            size="sm"
            className="text-xs text-slate-300 border-slate-700 hover:bg-slate-800"
            onClick={() => setIsFinalSubmitModalOpen(true)}
          >
            Finish Exam
          </Button>
        </div>
      </header>

      {/* Main Examination Viewport */}
      <main className="flex-1 p-6 md:p-8 max-w-4xl w-full mx-auto flex flex-col gap-5 animate-fadeIn">
        {/* Error Banner */}
        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md text-xs text-red-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Section & Progress Bar */}
        <div className="bg-white border border-slate-200 rounded-md p-4 shadow-2xs flex items-center justify-between text-xs">
          <div className="font-bold text-slate-900 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4C70A6]" />
            <span>{session?.sectionTitle || "General Section"}</span>
          </div>

          <div className="flex items-center gap-3 font-mono">
            {currentQ?.marks && (
              <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold text-[11px]">
                {currentQ.marks} {currentQ.marks === 1 ? "Mark" : "Marks"}
              </span>
            )}
            <span className="text-slate-500 font-semibold text-xs">
              Question {(session?.currentQuestionIndex ?? 0) + 1} of {session?.totalQuestions || 1}
            </span>
          </div>
        </div>

        {/* Active Question Card */}
        {currentQ ? (
          <div className="bg-white border border-slate-200 rounded-md p-6 shadow-2xs flex flex-col gap-6">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="info" className="text-[10px] font-mono uppercase">
                    {currentQ.type.replace("_", " ")}
                  </Badge>
                  <span className="text-xs text-slate-400 font-mono">
                    Question ID: {currentQ.id.slice(0, 8)}
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900 leading-relaxed whitespace-pre-wrap">
                  {currentQ.prompt}
                </h2>
              </div>
            </div>

            {/* Answer Input Controls */}
            {/* 1. Single-choice MCQ & True/False */}
            {(currentQ.type === "MCQ" || currentQ.type === "TRUE_FALSE") && currentQ.options && (
              <div className="flex flex-col gap-3">
                {currentQ.options.map((opt, idx) => {
                  const isSelected = selectedAnswer === opt.text || selectedAnswer === opt.id;
                  return (
                    <label
                      key={opt.id || idx}
                      onClick={() => setSelectedAnswer(opt.text)}
                      className={`w-full p-4 rounded-md border text-left flex items-center gap-3 transition-colors cursor-pointer text-xs ${
                        isSelected
                          ? "border-[#4C70A6] bg-[#4C70A6]/5 font-semibold text-slate-900 ring-1 ring-[#4C70A6]"
                          : "border-slate-200 hover:border-slate-300 text-slate-800 bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name="mcq_option"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 text-[#4C70A6] focus:ring-[#4C70A6]"
                      />
                      <span className="font-mono font-bold text-slate-400">
                        {String.fromCharCode(65 + idx)}.
                      </span>
                      <span className="leading-relaxed">{opt.text}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {/* 2. Multiple-choice MSQ */}
            {currentQ.type === "MSQ" && currentQ.options && (
              <div className="flex flex-col gap-3">
                <div className="text-[11px] text-slate-500 font-semibold mb-1">
                  Select all correct options:
                </div>
                {currentQ.options.map((opt, idx) => {
                  const selectedArr = Array.isArray(selectedAnswer) ? selectedAnswer : [];
                  const isChecked = selectedArr.includes(opt.text);
                  const toggleOption = () => {
                    if (isChecked) {
                      setSelectedAnswer(selectedArr.filter((item: string) => item !== opt.text));
                    } else {
                      setSelectedAnswer([...selectedArr, opt.text]);
                    }
                  };

                  return (
                    <label
                      key={opt.id || idx}
                      onClick={toggleOption}
                      className={`w-full p-4 rounded-md border text-left flex items-center gap-3 transition-colors cursor-pointer text-xs ${
                        isChecked
                          ? "border-[#4C70A6] bg-[#4C70A6]/5 font-semibold text-slate-900 ring-1 ring-[#4C70A6]"
                          : "border-slate-200 hover:border-slate-300 text-slate-800 bg-white"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="w-4 h-4 text-[#4C70A6] rounded focus:ring-[#4C70A6]"
                      />
                      <span className="font-mono font-bold text-slate-400">
                        {String.fromCharCode(65 + idx)}.
                      </span>
                      <span className="leading-relaxed">{opt.text}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {/* 3. Subjective SHORT / LONG Text Answer */}
            {(currentQ.type === "SHORT" || currentQ.type === "LONG" || !currentQ.options) && (
              <div className="flex flex-col gap-2">
                <textarea
                  rows={currentQ.type === "LONG" ? 10 : 5}
                  value={typeof selectedAnswer === "string" ? selectedAnswer : ""}
                  onChange={(e) => setSelectedAnswer(e.target.value)}
                  placeholder="Type your response here..."
                  className="w-full text-xs p-4 border border-slate-300 rounded-md focus:ring-2 focus:ring-[#4C70A6]/30 focus:border-[#4C70A6] outline-none font-sans leading-relaxed"
                />
                <div className="text-[11px] text-slate-400 font-mono text-right">
                  {(typeof selectedAnswer === "string" ? selectedAnswer.length : 0)} characters
                </div>
              </div>
            )}

            {/* Action Bar (Forward-Only Invariant) */}
            <div className="pt-5 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={handleSkipCurrentQuestion}
                disabled={isSubmittingAction}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 font-medium cursor-pointer disabled:opacity-50"
              >
                <SkipForward className="w-3.5 h-3.5" />
                <span>Skip Question</span>
              </button>

              <div className="flex items-center gap-3">
                <Button
                  variant="primary"
                  size="md"
                  disabled={isSubmittingAction}
                  className="bg-[#4C70A6] hover:bg-[#3F5E8E] text-white font-semibold flex items-center gap-2"
                  onClick={isLastQuestion ? () => setIsFinalSubmitModalOpen(true) : handleSubmitCurrentQuestion}
                >
                  {isSubmittingAction ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Recording Answer...</span>
                    </>
                  ) : isLastQuestion ? (
                    <>
                      <span>Review & Submit Exam</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>Next Question</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-md p-10 text-center flex flex-col items-center gap-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">All Questions Completed</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              You have reached the end of the examination. Click below to submit your attempt.
            </p>
            <Button
              variant="primary"
              size="lg"
              className="bg-[#4C70A6] hover:bg-[#3F5E8E] text-white"
              onClick={handleFinalExamSubmit}
            >
              Submit Examination Now
            </Button>
          </div>
        )}
      </main>

      {/* Confirmation Modal for Final Submit */}
      {isFinalSubmitModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-[#4C70A6] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Submit Final Examination?</h3>
                <p className="text-xs text-slate-500">
                  Once submitted, all responses will be saved and routed to the grading queue.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs font-mono text-slate-600">
              <div>Exam: {session?.examTitle}</div>
              <div>Current Question: {(session?.currentQuestionIndex ?? 0) + 1} / {session?.totalQuestions}</div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsFinalSubmitModalOpen(false)}
                disabled={isSubmittingAction}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-[#4C70A6] hover:bg-[#3F5E8E] text-white"
                onClick={handleFinalExamSubmit}
                disabled={isSubmittingAction}
              >
                {isSubmittingAction ? "Submitting..." : "Confirm & Submit"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
