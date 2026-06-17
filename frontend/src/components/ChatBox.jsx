import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, ChevronDown, ChevronRight, Loader2, Globe, Copy, Check, CornerDownLeft, Image as ImageIcon, X } from 'lucide-react';

function StepItem({ step, isExpanded, onToggle }) {
  return (
    <div className="border border-claude-hairline rounded-lg mb-1.5 overflow-hidden text-xs">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 bg-claude-surface-soft hover:bg-claude-surface-card transition-colors text-left"
      >
        {isExpanded ? <ChevronDown className="w-3 h-3 text-claude-muted-soft shrink-0" /> : <ChevronRight className="w-3 h-3 text-claude-muted-soft shrink-0" />}
        <span className="font-semibold text-claude-primary shrink-0">Step {step.step}</span>
        <span className="text-claude-muted truncate">{step.action?.substring(0, 80)}</span>
      </button>
      {isExpanded && (
        <div className="px-3 py-2 bg-claude-canvas space-y-1.5">
          <div>
            <span className="text-[10px] font-semibold text-claude-muted-soft uppercase tracking-wide">Action</span>
            <p className="text-claude-body mt-0.5">{step.action}</p>
          </div>
          {step.evaluation && (
            <div>
              <span className="text-[10px] font-semibold text-claude-muted-soft uppercase tracking-wide">Evaluation</span>
              <p className="text-claude-accent-teal mt-0.5">{step.evaluation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const BROWSER_TASK_PATTERNS = [/^go to/i, /^navigate/i, /^open/i, /^visit/i, /https?:\/\//, /\.(com|org|net|io|vn|dev)\b/i];
const looksLikeBrowserTask = (text) => BROWSER_TASK_PATTERNS.some(p => p.test(text.trim()));

// Quick examples — reused in both the empty state and the Quick Start guide
const EXAMPLES = [
  {
    id: 'data',
    icon: '📊',
    label: 'Data Extraction',
    short: 'github.com/trending → List top 5 repos',
    prompt: 'Go to github.com/trending → List top 5 repo names and star counts',
  },
  {
    id: 'login',
    icon: '🔑',
    label: 'Login Flow',
    short: 'Practice site → Login & extract result',
    prompt: 'Go to practicetestautomation.com/practice-test-login/ → Enter username "student" and password "Password123" → Click Login → Extract the result message',
  },
];

// Test case templates — positive + negative to cover both QA directions
const TEST_CASES = [
  {
    id: 'tc-positive',
    icon: '✅',
    title: 'Test case 1: Positive LogIn test',
    desc: 'Login với credentials đúng → verify thành công',
    prompt: `Test case 1: Positive LogIn test
Open page
Type username student into Username field
Type password Password123 into Password field
Push Submit button
Verify new page URL contains practicetestautomation.com/logged-in-successfully/
Verify new page contains expected text ('Congratulations' or 'successfully logged in')
Verify button Log out is displayed on the new page`,
  },
  {
    id: 'tc-negative',
    icon: '⛔',
    title: 'Test case 2: Negative username test',
    desc: 'Login với username sai → verify error message',
    prompt: `Test case 2: Negative username test
Open page
Type username incorrectUser into Username field
Type password Password123 into Password field
Push Submit button
Verify error message is displayed
Verify error message text is 'Your username is invalid!'`,
  },
];

export function ChatBox({ messages, onSend, status }) {
  const [input, setInput] = React.useState('');
  const [expandedSteps, setExpandedSteps] = useState({});
  const [warn, setWarn] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [copied, setCopied] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  // Auto-expand textarea to fit content (max 400px, then scroll).
  // Runs on every input change — including programmatic fills from examples.
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 400) + 'px';
  }, [input]);

  // Close the screenshot lightbox on Escape
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => { if (e.key === 'Escape') setLightbox(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  const handleSendTask = (e) => {
    e.preventDefault();
    const timestamp = new Date().toISOString();
    if (!input.trim()) return;
    if (!looksLikeBrowserTask(input)) {
      setWarn(true);
      return;
    }
    setWarn(false);
    onSend(input, timestamp);
    setInput('');
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (warn) setWarn(false);
  };

  // Enter sends, Shift+Enter inserts a newline (standard chat UX)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendTask(e);
    }
  };

  // Fill the input from an example/template and focus it
  const fillExample = (prompt) => {
    setInput(prompt);
    setShowGuide(false);
    setWarn(false);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  // Copy a prompt to clipboard with a brief "copied" confirmation
  const handleCopy = (text, id, e) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(c => (c === id ? null : c)), 1500);
  };

  const lineCount = input ? input.split('\n').length : 0;

  const toggleStep = (stepId) => {
    setExpandedSteps(prev => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  const renderMessageContent = (msg) => {
    const hasSteps = msg.stepDetails && msg.stepDetails.length > 0;
    const hasShots = msg.screenshots && msg.screenshots.length > 0;

    return (
      <div>
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>

        {hasSteps && (
          <div className="border-t border-claude-hairline pt-2 mt-3">
            <p className="text-[10px] font-semibold text-claude-muted-soft uppercase tracking-wide mb-1.5">Các bước thực hiện</p>
            {msg.stepDetails.map(step => (
              <StepItem
                key={step.step}
                step={step}
                isExpanded={!!expandedSteps[`${msg.id}-${step.step}`]}
                onToggle={() => toggleStep(`${msg.id}-${step.step}`)}
              />
            ))}
          </div>
        )}

        {hasShots && (
          <div className="border-t border-claude-hairline pt-2 mt-3">
            <p className="text-[10px] font-semibold text-claude-muted-soft uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <ImageIcon className="w-3 h-3" /> Ảnh chụp màn hình ({msg.screenshots.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {msg.screenshots.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setLightbox(src)}
                  title="Bấm để phóng to"
                  className="block rounded-lg overflow-hidden border border-claude-hairline hover:border-claude-primary hover:shadow-sm transition-all"
                >
                  <img src={src} alt={`screenshot ${i + 1}`} loading="lazy" className="h-24 w-auto object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-claude-canvas">
      {/* Screenshot lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 bg-claude-ink/80 flex items-center justify-center p-6 cursor-zoom-out animate-in fade-in"
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            title="Đóng (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightbox}
            alt="screenshot"
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full rounded-lg shadow-2xl cursor-default"
          />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 pb-16">
            <div className="w-14 h-14 rounded-2xl bg-claude-surface-card flex items-center justify-center mb-4">
              <Globe className="w-7 h-7 text-claude-primary" />
            </div>
            <h2 className="font-display text-2xl text-claude-ink">AI Browser Automation Agent</h2>
            <p className="text-sm text-claude-muted mt-1">MiniMax M2.5 · VNG Cloud</p>
            <p className="text-xs text-claude-muted-soft mt-3 max-w-xs leading-relaxed">
              Nhập lệnh bằng ngôn ngữ tự nhiên. AI sẽ tự động điều khiển trình duyệt và trả kết quả về giao diện này.
            </p>

            {/* Onboarding — clickable example prompts */}
            <div className="mt-6 w-full max-w-sm space-y-2">
              <p className="text-[10px] font-semibold text-claude-muted-soft uppercase tracking-wide text-left">Thử ngay</p>
              {EXAMPLES.map(ex => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => fillExample(ex.prompt)}
                  className="group w-full flex items-center gap-3 text-left bg-claude-surface-soft hover:bg-claude-surface-card border border-claude-hairline hover:border-claude-primary/50 hover:shadow-sm px-3 py-2.5 rounded-xl transition-all"
                >
                  <span className="text-base shrink-0">{ex.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="text-[10px] font-semibold text-claude-primary block">{ex.label}</span>
                    <span className="text-xs text-claude-body block truncate">{ex.short}</span>
                  </span>
                  <Send className="w-3.5 h-3.5 text-claude-muted-soft group-hover:text-claude-primary shrink-0 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={msg.id || `msg-${i}`} className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.sender !== 'user' && (
                <div className="w-7 h-7 rounded-full bg-claude-surface-card flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-claude-primary" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.sender === 'user'
                  ? 'bg-claude-primary text-white rounded-br-md'
                  : 'bg-claude-surface-soft border border-claude-hairline text-claude-body-strong rounded-bl-md'
              }`}>
                {renderMessageContent(msg)}
                <p className={`text-[10px] mt-1.5 ${msg.sender === 'user' ? 'text-white/70' : 'text-claude-muted-soft'}`}>
                  {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {msg.sender === 'user' && (
                <div className="w-7 h-7 rounded-full bg-claude-primary flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))
        )}

        {status === 'running' && (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-claude-surface-card flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-claude-primary" />
            </div>
            <div className="bg-claude-surface-soft border border-claude-hairline rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-claude-primary animate-spin" />
              <span className="text-sm text-claude-body">Agent đang xử lý...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-claude-hairline bg-claude-canvas px-4 pt-3 pb-4">
        <form onSubmit={handleSendTask}>
          <div className={`flex gap-2 border rounded-xl px-3 py-2 transition-colors ${warn ? 'border-claude-error bg-claude-error/10' : 'border-claude-hairline bg-white focus-within:border-claude-primary focus-within:ring-2 focus-within:ring-claude-primary/15'}`}>
            <Globe className="w-4 h-4 text-claude-muted-soft shrink-0 mt-2" />
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Go to [url] → [việc cần làm]"
              className="flex-1 bg-transparent text-sm text-claude-body-strong placeholder-claude-muted-soft focus:outline-none resize-none min-h-10 py-1"
              rows="1"
            />
            <button
              type="submit"
              disabled={status === 'running'}
              className="shrink-0 w-8 h-8 bg-claude-primary hover:bg-claude-primary-active disabled:bg-claude-primary-disabled text-white rounded-lg flex items-center justify-center transition-colors mt-2"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
          {warn ? (
            <p className="text-xs text-claude-error mt-1.5 px-1">
              Nhập URL hoặc lệnh điều hướng. Ví dụ: <span className="font-mono">Go to github.com/trending → ...</span>
            </p>
          ) : (
            <div className="flex items-center justify-between mt-1.5 px-1 text-[10px] text-claude-muted-soft">
              <span className="flex items-center gap-1">
                <kbd className="inline-flex items-center gap-0.5 font-sans font-medium text-claude-muted"><CornerDownLeft className="w-3 h-3" /> gửi</kbd>
                <span className="text-claude-hairline">·</span>
                <kbd className="font-sans font-medium text-claude-muted">⇧ + ↵ xuống dòng</kbd>
              </span>
              {input.length > 0 && (
                <span className="tabular-nums">{input.length} ký tự · {lineCount} dòng</span>
              )}
            </div>
          )}
        </form>

        {/* Quick Start Guide */}
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowGuide(v => !v)}
            className="flex items-center gap-1.5 text-xs font-medium text-claude-muted hover:text-claude-body-strong transition-colors py-1"
          >
            {showGuide ? <ChevronDown className="w-3.5 h-3.5 text-claude-primary" /> : <ChevronRight className="w-3.5 h-3.5 text-claude-muted-soft" />}
            <span>💡 Quick Start</span>
          </button>

          {showGuide && (
            <div className="mt-2 max-h-80 overflow-y-auto rounded-xl bg-gradient-to-b from-claude-surface-soft to-claude-surface-card border border-claude-hairline p-4 space-y-3 text-xs">
              <div>
                <p className="font-semibold text-claude-body-strong mb-1">Cách dùng</p>
                <p className="text-claude-body">Nhập lệnh: <span className="font-mono bg-white px-2 py-1 rounded text-claude-primary font-medium">Go to [url] → [việc cần làm]</span></p>
              </div>

              <div>
                <p className="font-semibold text-claude-body-strong mb-1.5">Ví dụ nhanh</p>
                <div className="space-y-1.5">
                  {EXAMPLES.map(ex => (
                    <div key={ex.id} className="group flex items-stretch gap-1 bg-transparent hover:bg-white rounded-lg transition-all border border-transparent hover:border-claude-primary/30">
                      <button type="button" onClick={() => fillExample(ex.prompt)} className="flex-1 min-w-0 text-left text-claude-body hover:text-claude-primary px-2.5 py-2 transition-colors">
                        <span className="font-mono text-[10px] text-claude-primary block mb-0.5">{ex.icon} {ex.label}</span>
                        <span className="text-xs block truncate">{ex.short}</span>
                      </button>
                      <button type="button" onClick={(e) => handleCopy(ex.prompt, ex.id, e)} title="Copy lệnh" className="shrink-0 w-8 flex items-center justify-center text-claude-muted-soft hover:text-claude-primary opacity-0 group-hover:opacity-100 transition-all">
                        {copied === ex.id ? <Check className="w-3.5 h-3.5 text-claude-success" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-claude-hairline pt-3">
                <p className="font-semibold text-claude-body-strong mb-2">Test Case Templates</p>
                <div className="space-y-2">
                  {TEST_CASES.map(tc => (
                    <div key={tc.id} className="group flex items-stretch gap-1 bg-white border-2 border-claude-primary/30 hover:border-claude-primary rounded-lg transition-all">
                      <button type="button" onClick={() => fillExample(tc.prompt)} className="flex-1 min-w-0 text-left hover:bg-claude-surface-soft px-3 py-2.5 rounded-l-md transition-colors">
                        <span className="font-mono text-[10px] text-claude-primary font-semibold block mb-1">{tc.icon} {tc.title}</span>
                        <span className="text-[11px] text-claude-body block leading-relaxed">{tc.desc}</span>
                      </button>
                      <button type="button" onClick={(e) => handleCopy(tc.prompt, tc.id, e)} title="Copy test case" className="shrink-0 w-9 flex items-center justify-center text-claude-muted-soft hover:text-claude-primary border-l border-claude-hairline transition-colors">
                        {copied === tc.id ? <Check className="w-3.5 h-3.5 text-claude-success" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-claude-hairline rounded-lg p-2.5 text-[11px] text-claude-body">
                <p className="font-semibold text-claude-body-strong mb-1.5">Khả năng</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  <span>✅ Trích xuất dữ liệu</span>
                  <span>✅ Điền form &amp; đăng nhập</span>
                  <span>✅ Điều hướng nhiều bước</span>
                </div>
                <p className="mt-1.5 pt-1.5 border-t border-claude-hairline-soft text-claude-muted">⛔ Không hỗ trợ: CAPTCHA, 2FA, upload file</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
