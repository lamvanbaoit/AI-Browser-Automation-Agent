import { useState, useRef, useEffect } from 'react';
import { FlaskConical, ChevronDown, ChevronRight, Loader2, ClipboardList, TestTube, Send } from 'lucide-react';

const API = '/api/v1';

function ScenarioCard({ sc, index }) {
  const [open, setOpen] = useState(false);
  const typeColor = { positive: 'text-emerald-600 bg-emerald-50 border-emerald-200', negative: 'text-red-500 bg-red-50 border-red-200', boundary: 'text-amber-600 bg-amber-50 border-amber-200' };
  const tc = typeColor[sc.type] || 'text-slate-500 bg-slate-100 border-slate-200';
  return (
    <div className="border border-slate-200 rounded-xl mb-2 overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left">
        {open ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
        <span className="text-xs font-bold text-slate-500 shrink-0">{sc.scenario_id}</span>
        <span className="text-sm font-medium text-slate-800 flex-1 truncate">{sc.title}</span>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${tc} shrink-0`}>{sc.type}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded border border-slate-200 text-slate-500 shrink-0`}>{sc.priority}</span>
      </button>
      {open && (
        <div className="px-4 py-3 space-y-2 text-sm bg-white">
          {sc.description && <p className="text-slate-600 italic">{sc.description}</p>}
          <div className="grid grid-cols-1 gap-1.5 text-xs">
            <Row label="Given" value={sc.given} />
            <Row label="When" value={sc.when} />
            <Row label="Then" value={sc.then} />
            {sc.related_endpoint && <Row label="Endpoint" value={sc.related_endpoint} mono />}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="flex gap-2">
      <span className="font-semibold text-slate-400 w-14 shrink-0">{label}</span>
      <span className={`text-slate-700 ${mono ? 'font-mono text-blue-600' : ''}`}>{value}</span>
    </div>
  );
}

function TestCaseCard({ tc }) {
  const [open, setOpen] = useState(false);
  const tagColor = { ep: 'bg-blue-50 text-blue-600 border-blue-200', bva: 'bg-purple-50 text-purple-600 border-purple-200', uc: 'bg-green-50 text-green-600 border-green-200' };
  return (
    <div className="border border-slate-200 rounded-xl mb-2 overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-white hover:bg-slate-50 transition-colors text-left">
        {open ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
        <span className="text-xs font-bold text-slate-400 shrink-0">{tc.test_case_id}</span>
        <span className="text-sm font-medium text-slate-800 flex-1 truncate">{tc.name}</span>
        <div className="flex gap-1 shrink-0">
          {(tc.tags || []).map(tag => (
            <span key={tag} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${tagColor[tag] || 'bg-slate-50 text-slate-500 border-slate-200'}`}>{tag.toUpperCase()}</span>
          ))}
        </div>
      </button>
      {open && (
        <div className="px-4 py-3 space-y-2.5 text-xs bg-slate-50 border-t border-slate-200">
          {tc.preconditions && (
            <div>
              <span className="font-semibold text-slate-400 uppercase text-[10px]">Preconditions</span>
              <p className="text-slate-600 mt-0.5">{tc.preconditions}</p>
            </div>
          )}
          {tc.steps?.length > 0 && (
            <div>
              <span className="font-semibold text-slate-400 uppercase text-[10px]">Steps</span>
              <ol className="mt-0.5 space-y-0.5 list-decimal list-inside text-slate-700">
                {tc.steps.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
            </div>
          )}
          {tc.expected_result && (
            <div>
              <span className="font-semibold text-slate-400 uppercase text-[10px]">Expected</span>
              <p className="text-emerald-600 mt-0.5">{tc.expected_result}</p>
            </div>
          )}
          {tc.test_data && Object.keys(tc.test_data).length > 0 && (
            <div>
              <span className="font-semibold text-slate-400 uppercase text-[10px]">Test Data</span>
              <pre className="mt-0.5 bg-white border border-slate-200 rounded p-2 text-[11px] text-slate-700 overflow-x-auto">{JSON.stringify(tc.test_data, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultBlock({ item }) {
  const [showTestCases, setShowTestCases] = useState(false);
  const [testCases, setTestCases] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateTestCases = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/qa/test-cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarios: item.scenarios }),
      });
      const data = await res.json();
      setTestCases(data);
      setShowTestCases(true);
    } catch (e) {
      setTestCases({ error: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Scenarios */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <ClipboardList className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-semibold text-slate-700">{item.scenarios.length} Test Scenarios</span>
        </div>
        {item.scenarios.map((sc, i) => <ScenarioCard key={sc.scenario_id || i} sc={sc} index={i} />)}
      </div>

      {/* Generate test cases CTA */}
      {!testCases && (
        <button
          onClick={generateTestCases}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-medium rounded-xl transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
          {loading ? 'Đang tạo test cases...' : 'Generate Test Cases'}
        </button>
      )}

      {/* Test cases */}
      {testCases && !testCases.error && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TestTube className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-semibold text-slate-700">{testCases.test_cases?.length || 0} Test Cases</span>
            {testCases.applied_techniques?.length > 0 && (
              <div className="flex gap-1 ml-2">
                {testCases.applied_techniques.map(t => (
                  <span key={t.technique} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 border border-purple-200 text-purple-600">{t.technique}</span>
                ))}
              </div>
            )}
          </div>
          {(testCases.test_cases || []).map((tc, i) => <TestCaseCard key={tc.test_case_id || i} tc={tc} />)}
        </div>
      )}
      {testCases?.error && <p className="text-sm text-red-500">Lỗi: {testCases.error}</p>}
    </div>
  );
}

export function QABox() {
  const [input, setInput] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [items, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || text.length < 10) {
      setError('Nhập ít nhất 10 ký tự mô tả requirements.');
      return;
    }
    setError('');
    setInput('');
    const userItem = { type: 'user', text };
    setItems(prev => [...prev, userItem]);
    setLoading(true);
    try {
      const res = await fetch(`${API}/qa/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setItems(prev => [...prev, { type: 'result', scenarios: data.scenarios || [], summary: data.requirements_summary || [] }]);
    } catch (e) {
      setItems(prev => [...prev, { type: 'error', message: e.message }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
        {items.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center pb-16">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
              <FlaskConical className="w-7 h-7 text-purple-500" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">QA Requirements Analyzer</h2>
            <p className="text-sm text-slate-500 mt-1">Multi-Agent Quality Engineer · VNG Cloud</p>
            <p className="text-xs text-slate-400 mt-3 max-w-sm leading-relaxed">
              Nhập mô tả yêu cầu (requirements) — AI tự phân tích, tạo test scenarios và sinh test cases theo EP, BVA, UC.
            </p>
            <div className="mt-5 text-left bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-sm text-xs space-y-1.5 text-slate-500">
              <p className="font-semibold text-slate-700 mb-1">Ví dụ requirements:</p>
              <button className="block text-left hover:text-blue-600 transition-colors" onClick={() => setInput('User can login with username and password. Show error message if credentials are incorrect. Lock account after 5 failed attempts.')}>
                → Login với username/password, khóa sau 5 lần sai
              </button>
              <button className="block text-left hover:text-blue-600 transition-colors" onClick={() => setInput('User can add items to shopping cart. Cart shows total price. User can remove items. Maximum 10 items per cart.')}>
                → Giỏ hàng: thêm/xóa sản phẩm, tối đa 10 items
              </button>
              <button className="block text-left hover:text-blue-600 transition-colors" onClick={() => setInput('API endpoint POST /users/register accepts email and password. Email must be valid format. Password minimum 8 characters with at least one uppercase and one number.')}>
                → API đăng ký user, validate email và password
              </button>
            </div>
          </div>
        )}

        {items.map((item, i) => {
          if (item.type === 'user') {
            return (
              <div key={i} className="flex justify-end">
                <div className="max-w-[80%] bg-blue-600 text-white rounded-2xl rounded-br-md px-4 py-3">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{item.text}</p>
                </div>
              </div>
            );
          }
          if (item.type === 'result') {
            return (
              <div key={i} className="flex justify-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-purple-50 flex items-center justify-center shrink-0 mt-0.5">
                  <FlaskConical className="w-4 h-4 text-purple-500" />
                </div>
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3">
                  <ResultBlock item={item} />
                </div>
              </div>
            );
          }
          if (item.type === 'error') {
            return (
              <div key={i} className="flex justify-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
                  <FlaskConical className="w-4 h-4 text-red-400" />
                </div>
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl rounded-bl-md px-4 py-3 text-sm">
                  ❌ {item.message}
                </div>
              </div>
            );
          }
          return null;
        })}

        {loading && (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
              <FlaskConical className="w-4 h-4 text-purple-500" />
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-purple-500 animate-spin" />
              <span className="text-sm text-slate-600">Đang phân tích requirements...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 bg-white px-4 pt-3 pb-4">
        <form onSubmit={handleSubmit}>
          <div className="flex items-end gap-2 border border-slate-300 rounded-xl px-3 py-2 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-100 transition-colors bg-white">
            <textarea
              value={input}
              onChange={e => { setInput(e.target.value); if (error) setError(''); }}
              placeholder="Nhập requirements... (ví dụ: User can login với username và password)"
              rows={2}
              className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none resize-none"
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
            />
            <button
              type="submit"
              disabled={loading}
              className="shrink-0 w-8 h-8 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white rounded-lg flex items-center justify-center transition-colors mb-0.5"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
          {error && <p className="text-xs text-red-500 mt-1.5 px-1">{error}</p>}
          <p className="text-[10px] text-slate-400 mt-1.5 px-1">Enter để gửi · Shift+Enter xuống dòng</p>
        </form>
      </div>
    </div>
  );
}
