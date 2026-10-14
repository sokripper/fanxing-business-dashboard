'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowUp, ArrowUpRight, MessageCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const suggestions = [
  '有哪些类似项目的方案可以参考？',
  '项目复盘应该整理哪些内容？',
  '报销需要准备哪些材料？',
];

export default function KnowledgeWorkspace() {
  const [question, setQuestion] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);
  const conversation = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const panel = conversation.current;
    if (panel) panel.scrollTop = panel.scrollHeight;
  }, [questions]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = question.trim();
    if (!value) return;
    setQuestions(items => [...items, value]);
    setQuestion('');
    input.current?.focus();
  }

  function newConversation() {
    setQuestion('');
    setQuestions([]);
    input.current?.focus();
  }

  return (
    <section className="knowledge-chat" aria-label="知识问答">
      <div className="knowledge-chat-header">
        <div><h1>知识中心</h1><p>从企业知识中，寻找问题的答案</p></div>
        <Button variant="outline" onClick={newConversation} disabled={!questions.length && !question}>
          <Plus size={16} />新对话
        </Button>
      </div>
      <div className="knowledge-conversation" ref={conversation}>
        {!questions.length ? (
          <div className="knowledge-welcome">
            <span className="knowledge-chat-mark"><MessageCircle size={29} /></span>
            <h2>有什么想了解的？</h2>
            <p>查方案、找案例、了解制度，从一个具体问题开始。</p>
            <div className="qa-suggestions">
              {suggestions.map(value => (
                <button key={value} onClick={() => { setQuestion(value); input.current?.focus(); }}>
                  {value}<ArrowUpRight size={16} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="knowledge-messages" role="log" aria-label="当前对话" aria-live="polite">
            {questions.map((value, index) => (
              <div className="knowledge-exchange" key={index}>
                <div className="knowledge-user-message"><span className="sr-only">你的问题：</span>{value}</div>
                <div className="knowledge-service-message">
                  <span className="document-icon"><MessageCircle size={20} /></span>
                  <div><strong>知识库尚未连接</strong><p>这条问题仅保留在当前页面，尚未发送。连接企业知识库后，这里将展示回答和对应的资料来源。</p></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="knowledge-composer-wrap">
        <form className="knowledge-composer" onSubmit={submit}>
          <label className="sr-only" htmlFor="knowledge-question">向知识中心提问</label>
          <textarea ref={input} id="knowledge-question" value={question} onChange={event => setQuestion(event.target.value)} placeholder="输入你的问题…" rows={3} maxLength={2000} />
          <div className="knowledge-composer-actions">
            <span>企业知识问答</span>
            <Button type="submit" disabled={!question.trim()} aria-label="发送问题（本地演示）"><ArrowUp size={17} />发送</Button>
          </div>
        </form>
        <p className="knowledge-chat-note">当前为问答界面演示 · 知识库待接入 · 问题不会发送，刷新后清空</p>
      </div>
    </section>
  );
}
