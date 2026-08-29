import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../../api";
import { IconClose, IconCopy, IconRefresh, IconSend, IconSparkle } from "./TenderIcons";

const DEFAULT_SUGGESTIONS = [
  "What is the submission deadline and bid opening date?",
  "How much EMD and tender fee do we need to pay?",
  "List the eligibility criteria we must meet.",
  "Which documents must be submitted with the bid?",
  "What are the penalties and payment terms?",
];

function buildSuggestions(document) {
  const suggestions = [];
  if (document?.submissionDeadline || document?.bidOpeningDate) {
    suggestions.push("What are all the key dates we must track for this tender?");
  }
  if (document?.emdAmount || document?.tenderFee) {
    suggestions.push("How much EMD and tender fee do we need to pay, and how?");
  }
  if ((document?.technicalCriteria || []).length) {
    suggestions.push("Summarise the technical qualification criteria.");
  }
  if ((document?.requiredDocuments || []).length) {
    suggestions.push("Which documents must be submitted with the bid?");
  }
  if ((document?.penalties || []).length || (document?.paymentTerms || []).length) {
    suggestions.push("Explain the payment terms and penalty clauses.");
  }
  const merged = [...suggestions, ...DEFAULT_SUGGESTIONS];
  return Array.from(new Set(merged)).slice(0, 4);
}

/** Renders bold markers and bullet lines without pulling in a markdown dependency. */
function renderInline(text, keyPrefix) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={`${keyPrefix}-b-${index}`}>{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={`${keyPrefix}-t-${index}`}>{part}</React.Fragment>;
  });
}

function FormattedAnswer({ text }) {
  const blocks = useMemo(() => {
    const lines = String(text || "").split(/\r?\n/);
    const result = [];
    let bullets = null;

    lines.forEach((rawLine) => {
      const line = rawLine.trim();
      const bulletMatch = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);

      if (bulletMatch) {
        if (!bullets) {
          bullets = [];
          result.push({ type: "list", items: bullets });
        }
        bullets.push(bulletMatch[1]);
        return;
      }

      bullets = null;
      if (line) {
        result.push({ type: "paragraph", text: line });
      }
    });

    return result;
  }, [text]);

  if (blocks.length === 0) {
    return <p>{text}</p>;
  }

  return (
    <>
      {blocks.map((block, index) =>
        block.type === "list" ? (
          <ul key={`list-${index}`}>
            {block.items.map((item, itemIndex) => (
              <li key={`list-${index}-${itemIndex}`}>{renderInline(item, `l${index}${itemIndex}`)}</li>
            ))}
          </ul>
        ) : (
          <p key={`para-${index}`}>{renderInline(block.text, `p${index}`)}</p>
        )
      )}
    </>
  );
}

function clockLabel() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function TenderChatWidget({
  jobId,
  docIndex,
  document,
  open,
  onClose,
  messages,
  setMessages,
}) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const bodyRef = useRef(null);
  const inputRef = useRef(null);
  const lastQuestionRef = useRef("");

  const suggestions = useMemo(() => buildSuggestions(document), [document]);
  const tenderLabel = document?.tenderTitle || document?.relativePath || "this tender";

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 220);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, loading, open]);

  const ask = useCallback(
    async (rawQuestion) => {
      const trimmed = String(rawQuestion || "").trim();
      if (!trimmed || loading) return;

      lastQuestionRef.current = trimmed;
      setQuestion("");
      setMessages((prev) => [
        ...prev.filter((message) => message.role !== "error"),
        { role: "user", text: trimmed, time: clockLabel() },
      ]);
      setLoading(true);

      try {
        const { data } = await api.post(`/tender-jobs/${jobId}/documents/${docIndex}/chat`, {
          question: trimmed,
        });
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: data.answer || "No answer was returned for this question.",
            time: clockLabel(),
          },
        ]);
      } catch (err) {
        const detail =
          err.response?.data?.message ||
          err.response?.data?.error?.message ||
          err.message ||
          "Failed to get an answer.";
        setMessages((prev) => [...prev, { role: "error", text: detail, time: clockLabel() }]);
      } finally {
        setLoading(false);
      }
    },
    [docIndex, jobId, loading, setMessages]
  );

  const handleSubmit = (event) => {
    event.preventDefault();
    ask(question);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      ask(question);
    }
  };

  const handleCopy = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      window.setTimeout(() => setCopiedIndex(null), 1600);
    } catch {
      /* clipboard unavailable - nothing to do */
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="tender-chat-backdrop d-lg-none" onClick={onClose} role="presentation" />
      <aside className="tender-chat" role="dialog" aria-label="Tender AI assistant">
        <header className="tender-chat__head">
          <div className="tender-chat__avatar">
            <IconSparkle size={20} />
            <span className="tender-chat__online" />
          </div>
          <div className="flex-grow-1 min-w-0">
            <div className="tender-chat__title">Tender Assistant</div>
            <div className="tender-chat__subtitle" title={tenderLabel}>
              Answers sourced from {tenderLabel}
            </div>
          </div>
          {messages.length > 0 && (
            <button
              type="button"
              className="tender-chat__iconbtn"
              onClick={() => setMessages([])}
              title="Clear conversation"
              aria-label="Clear conversation"
            >
              <IconRefresh size={16} />
            </button>
          )}
          <button
            type="button"
            className="tender-chat__iconbtn"
            onClick={onClose}
            title="Close assistant"
            aria-label="Close assistant"
          >
            <IconClose size={16} />
          </button>
        </header>

        <div className="tender-chat__body" ref={bodyRef}>
          {messages.length === 0 && (
            <div className="tender-chat__welcome">
              <div className="tender-chat__welcome-avatar">
                <IconSparkle size={26} />
              </div>
              <div className="fw-semibold mb-1">Ask anything about this tender</div>
              <p className="text-muted small mb-3">
                Every answer is generated only from the uploaded tender documents and the extracted
                analysis - no assumptions are added.
              </p>
              <div className="text-start">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="tender-chat__suggest"
                    onClick={() => ask(suggestion)}
                    disabled={loading}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message, index) => {
            const isUser = message.role === "user";
            const isError = message.role === "error";
            return (
              <div
                key={`${message.role}-${index}`}
                className={`tender-msg ${isUser ? "tender-msg--user" : "tender-msg--bot"} ${
                  isError ? "tender-msg--error" : ""
                }`}
              >
                <div className="tender-msg__avatar">{isUser ? "You" : <IconSparkle size={15} />}</div>
                <div>
                  <div className="tender-msg__bubble">
                    {isUser || isError ? <p>{message.text}</p> : <FormattedAnswer text={message.text} />}
                  </div>
                  <div className={`tender-msg__meta ${isUser ? "justify-content-end" : ""}`}>
                    <span>{message.time}</span>
                    {message.role === "assistant" && (
                      <button
                        type="button"
                        className="tender-msg__copy d-inline-flex align-items-center gap-1"
                        onClick={() => handleCopy(message.text, index)}
                      >
                        <IconCopy size={12} />
                        {copiedIndex === index ? "Copied" : "Copy"}
                      </button>
                    )}
                    {isError && (
                      <button
                        type="button"
                        className="tender-msg__copy"
                        onClick={() => ask(lastQuestionRef.current)}
                      >
                        Retry
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="tender-msg tender-msg--bot">
              <div className="tender-msg__avatar">
                <IconSparkle size={15} />
              </div>
              <div className="tender-msg__bubble">
                <span className="tender-typing">
                  <span />
                  <span />
                  <span />
                </span>
              </div>
            </div>
          )}
        </div>

        <form className="tender-chat__foot" onSubmit={handleSubmit}>
          <div className="tender-chat__inputwrap">
            <textarea
              ref={inputRef}
              className="tender-chat__input"
              rows={1}
              placeholder="Ask about dates, EMD, eligibility, penalties..."
              value={question}
              onChange={(event) => {
                setQuestion(event.target.value);
                const el = event.target;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
              }}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button
              type="submit"
              className="tender-chat__send"
              disabled={loading || !question.trim()}
              aria-label="Send question"
            >
              <IconSend size={18} />
            </button>
          </div>
          <div className="tender-chat__hint">Enter to send - Shift + Enter for a new line</div>
        </form>
      </aside>
    </>
  );
}
