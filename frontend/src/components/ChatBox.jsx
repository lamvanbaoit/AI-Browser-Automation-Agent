import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, ChevronDown, ChevronRight, Loader2, Globe } from 'lucide-react';

function StepItem({ step, isExpanded, onToggle }) {
  return (
    <div className="border border-slate-200 rounded-lg mb-1.5 overflow-hidden text-xs">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        {isExpanded ? <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" /> : <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />}
        <span className="font-semibold text-blue-600 shrink-0">Step {step.step}</span>
        <span className="text-slate-500 truncate">{step.action?.substring(0, 80)}</span>
      </button>
      {isExpanded && (
        <div className="px-3 py-2 bg-white space-y-1.5">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Action</span>
            <p className="text-slate-700 mt-0.5">{step.action}</p>
          </div>
          {step.evaluation && (
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Evaluation</span>
              <p className="text-emerald-600 mt-0.5">{step.evaluation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const BROWSER_TASK_PATTERNS = [/^go to/i, /^navigate/i, /^open/i, /^visit/i, /https?:\/\//, /\.(com|org|net|io|vn|dev)\b/i];
const looksLikeBrowserTask = (text) => BROWSER_TASK_PATTERNS.some(p => p.test(text.trim()));

export function ChatBox({ messages, onSend, status }) {
  const [input, setInput] = React.useState('');
  const [expandedSteps, setExpandedSteps] = useState({});
  const [warn, setWarn] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

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

  const toggleStep = (stepId) => {
    setExpandedSteps(prev => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  const renderMessageContent = (msg) => {
    if (msg.stepDetails && msg.stepDetails.length > 0) {
      const screenshots = msg.screenshots || [];
      return (
        <div>
          <p className="text-sm whitespace-pre-wrap mb-3 leading-relaxed">{msg.content}</p>
          <div className="border-t border-slate-200 pt-2 mt-2">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Các bước thực hiện</p>
            {msg.stepDetails.map(step => (
              <StepItem
                key={step.step}
                step={step}
                isExpanded={!!expandedSteps[`${msg.id}-${step.step}`]}
                onToggle={() => toggleStep(`${msg.id}-${step.step}`)}
                screenshot={screenshots.find(ss => ss.step === step.step)}
              />
            ))}
          </div>
        </div>
      );
    }
    return <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>;
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center pb-16">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
              <Globe className="w-7 h-7 text-blue-500" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">AI Browser Automation Agent</h2>
            <p className="text-sm text-slate-500 mt-1">MiniMax M2.5 · VNG Cloud</p>
            <p className="text-xs text-slate-400 mt-3 max-w-xs leading-relaxed">
              Nhập lệnh bằng ngôn ngữ tự nhiên. AI sẽ tự động điều khiển trình duyệt và trả kết quả về giao diện này.
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={msg.id || `msg-${i}`} className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.sender !== 'user' && (
                <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-blue-500" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-br-md'
                  : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-bl-md'
              }`}>
                {renderMessageContent(msg)}
                <p className={`text-[10px] mt-1.5 ${msg.sender === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                  {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {msg.sender === 'user' && (
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))
        )}

        {status === 'running' && (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-blue-500" />
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
              <span className="text-sm text-slate-600">Agent đang xử lý...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-slate-200 bg-white px-4 pt-3 pb-4">
        <form onSubmit={handleSendTask}>
          <div className={`flex items-center gap-2 border rounded-xl px-3 py-2 transition-colors ${warn ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100'}`}>
            <Globe className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Go to [url] → [việc cần làm]"
              className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={status === 'running'}
              className="shrink-0 w-8 h-8 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg flex items-center justify-center transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
          {warn && (
            <p className="text-xs text-red-500 mt-1.5 px-1">
              Nhập URL hoặc lệnh điều hướng. Ví dụ: <span className="font-mono">Go to github.com/trending → ...</span>
            </p>
          )}
        </form>

        {/* Guide */}
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowGuide(v => !v)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors py-1"
          >
            {showGuide ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <span>Hướng dẫn &amp; ví dụ</span>
          </button>

          {showGuide && (
            <div className="mt-1 max-h-48 overflow-y-auto rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2 text-xs leading-relaxed">
              <p className="text-slate-500">Đây là AI Browser Automation Agent — một web app cho phép người dùng ra lệnh bằng tiếng tự nhiên để tự động hóa trình duyệt.</p>
              <p className="font-semibold text-slate-700">Cách dùng</p>
              <p className="text-slate-500">Nhập lệnh theo cú pháp: <span className="font-mono text-slate-700">Go to [url] → [việc cần làm]</span></p>
              <p className="text-slate-500">Agent tự mở trình duyệt, điều hướng và thực hiện yêu cầu.</p>

              <p className="font-semibold text-slate-700 pt-1">Làm được</p>
              <p className="text-slate-500">✅ Trích xuất dữ liệu — danh sách, bảng, đoạn văn, giá cả</p>
              <p className="text-slate-500">✅ Điền form và đăng nhập — nhập text, click nút, đọc kết quả</p>
              <p className="text-slate-500">✅ Điều hướng nhiều bước — mở trang, tìm phần tử, thực hiện hành động</p>

              <p className="font-semibold text-slate-700 pt-1">Không làm được</p>
              <p className="text-slate-500">⛔ CAPTCHA, xác minh 2 bước, tải file lên</p>

              <p className="font-semibold text-slate-700 pt-1">Ví dụ nhanh bấm vào các nút dưới đây</p>
              <button type="button" onClick={() => { setInput('Go to youtube.com/results?search_query=AI+news+2026 → List title and channel of first 3 videos'); setShowGuide(false); }} className="block text-left text-slate-500 hover:text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 rounded transition-colors font-mono w-full">→ youtube.com/results?search_query=AI+news+2026 → List title and channel of first 3 videos</button>
              <button type="button" onClick={() => { setInput('Go to github.com/trending → List top 5 repo names and star counts'); setShowGuide(false); }} className="block text-left text-slate-500 hover:text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 rounded transition-colors font-mono w-full">→ github.com/trending → List top 5 repo names and star counts</button>
              <button type="button" onClick={() => { setInput('Go to en.wikipedia.org/wiki/Artificial_intelligence → Extract the first paragraph of the introduction only'); setShowGuide(false); }} className="block text-left text-slate-500 hover:text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 rounded transition-colors font-mono w-full">→ en.wikipedia.org/wiki/Artificial_intelligence → Extract the first paragraph</button>
              <button type="button" onClick={() => { setInput('Go to old.reddit.com/r/technology → List titles of top 3 posts'); setShowGuide(false); }} className="block text-left text-slate-500 hover:text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 rounded transition-colors font-mono w-full">→ old.reddit.com/r/technology → List titles of top 3 posts</button>
              <button type="button" onClick={() => { setInput('Go to google.com/search?q=weather+Hanoi+today → Extract temperature and weather condition only'); setShowGuide(false); }} className="block text-left text-slate-500 hover:text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 rounded transition-colors font-mono w-full">→ google.com/search?q=weather+Hanoi+today → Extract temperature and weather condition</button>
              <button type="button" onClick={() => { setInput('Go to practicetestautomation.com/practice-test-login/ → Enter username "student" and password "Password123" → Click Login → Extract the result message'); setShowGuide(false); }} className="block text-left text-slate-500 hover:text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 rounded transition-colors font-mono w-full">→ practicetestautomation.com/practice-test-login/ → Login → Extract result message</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
