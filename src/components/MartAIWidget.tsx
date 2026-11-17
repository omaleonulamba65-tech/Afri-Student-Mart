import React, { useState } from 'react';
import { Bot, Send, Sparkles, X } from 'lucide-react';
import { api } from '../lib/api';

interface MartAIWidgetProps {
  institution?: string;
}

interface AIMessage {
  role: 'user' | 'assistant';
  text: string;
}

const QUICK_PROMPTS = [
  'Find laptops or phones in my school',
  'Suggest a fair price for a neatly used laptop',
  'Help me write a clean description for my textbooks',
  'How do I buy and sell safely on campus?',
];

export const MartAIWidget: React.FC<MartAIWidgetProps> = ({ institution }) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      role: 'assistant',
      text: `How far! I'm Mart AI, your campus shopping & selling helper${
        institution ? ` for ${institution}` : ''
      }. Ask me to find items in your school, suggest fair ₦ prices, write item descriptions, or share safety tips!`,
    },
  ]);

  const sendPrompt = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const nextHistory = [...messages, { role: 'user' as const, text: trimmed }];
    setMessages(nextHistory);
    setInput('');
    setLoading(true);

    try {
      const res = await api.askMartAI({
        message: trimmed,
        institution,
        history: nextHistory,
      });
      setMessages((prev) => [...prev, { role: 'assistant', text: res.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text:
            err instanceof Error
              ? `Sorry, I ran into an issue: ${err.message}`
              : 'Sorry, Mart AI could not reply right now.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Mart AI Button — positioned cleanly above mobile bottom nav */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-30 min-h-[48px] px-4 rounded-full bg-yellow-400 text-green-950 font-extrabold text-sm shadow-lg border-2 border-green-800 flex items-center gap-2 hover:bg-yellow-300 active:scale-95 transition-transform"
          aria-label="Open Mart AI Assistant"
        >
          <Sparkles className="w-4 h-4 text-green-900" />
          <span>Mart AI</span>
        </button>
      )}

      {/* Mart AI Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white sm:bg-black/45 sm:items-end sm:justify-end sm:p-5">
          <div className="flex flex-col w-full h-full sm:h-[580px] sm:max-h-[85vh] sm:w-[400px] bg-white sm:rounded-2xl sm:shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between bg-green-800 text-white px-4 py-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-yellow-400 text-green-950 flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-base font-bold leading-tight">Mart AI</div>
                  <div className="text-xs text-yellow-300 truncate">
                    {institution || 'Nigerian Campus Student Helper'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-green-700"
                aria-label="Close Mart AI"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                      m.role === 'user'
                        ? 'bg-green-700 text-white rounded-br-sm'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-white border border-slate-200 px-4 py-2.5 text-sm text-slate-500">
                    Mart AI is typing...
                  </div>
                </div>
              )}

              {/* Quick Suggestions */}
              {messages.length <= 2 && !loading && (
                <div className="pt-2 space-y-1.5">
                  <div className="text-xs font-semibold text-slate-500">Quick Campus Help:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_PROMPTS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => sendPrompt(q)}
                        className="text-left rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-900 hover:bg-green-100"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendPrompt(input);
              }}
              className="border-t border-slate-200 p-3 bg-white flex items-center gap-2 pb-safe"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Mart AI anything..."
                className="flex-1 min-h-[44px] rounded-xl border border-slate-300 px-3.5 text-sm focus:border-green-700 focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="min-h-[44px] min-w-[44px] rounded-xl bg-green-700 text-white flex items-center justify-center hover:bg-green-800 disabled:opacity-50"
                aria-label="Send to Mart AI"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
