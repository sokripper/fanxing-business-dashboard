'use client';
import { useState } from 'react';
import { Plus, MessageSquare, ArrowUpRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

type Topic = { id: string; title: string; category: string; author: string; status: string; body: string; replies: string[] };
const examples: Topic[] = [
  { id:'sample-1', title:'需要园区宣传资源，如何向其他部门描述需求？', category:'需求交流', author:'销售同事（示例）', status:'讨论中', body:'希望在跨部门对接时，把业务场景、交付范围与时间要求说清楚。大家通常会补充哪些资料？这是交流流程示例，不是真实采购需求。', replies:['建议先写明用途、交付物和时间，再提供已有参考。合作资源的能力与报价仍需要单独确认。'] },
  { id:'sample-2', title:'分享一份项目复盘的内容结构', category:'经验分享', author:'交付同事（示例）', status:'已有结论', body:'复盘可以按背景、关键决策、执行变化、最终结果与复用条件整理。保留问题和验证过程，便于后续项目判断是否适用。此帖仅用于展示。', replies:['可复用的结论可以整理为案例，同时保留原讨论作为背景依据。'] },
  { id:'sample-3', title:'跨部门资源信息，建议保留哪些字段？', category:'资源对接', author:'运营同事（示例）', status:'讨论中', body:'除了资源名称，希望保留内部对接人、适用场景、历史经验和更新时间，避免只留一个联系方式。本帖不包含真实资源或人员信息。', replies:[] },
];
export default function CollaborationWorkspace() {
  const [topics,setTopics]=useState(examples);
  const [category,setCategory]=useState('全部');
  const [query,setQuery]=useState('');
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [composing,setComposing]=useState(false);
  const [title,setTitle]=useState('');
  const [body,setBody]=useState('');
  const [topicCategory,setTopicCategory]=useState('需求交流');
  const [reply,setReply]=useState('');
  const [notice,setNotice]=useState('');
  const selected=topics.find(t=>t.id===selectedId);
  const visible=topics.filter(t=>(category==='全部'||t.category===category)&&`${t.title} ${t.body}`.includes(query.trim()));
  function addTopic() {
    if(!title.trim()||!body.trim())return;
    setTopics(prev=>[{id:`local-${Date.now()}`,title:title.trim(),body:body.trim(),category:topicCategory,author:'我（本页演示）',status:'讨论中',replies:[]},...prev]);
    setTitle('');setBody('');setComposing(false);setCategory('全部');setQuery('');setNotice('话题已加入本页演示，尚未发布到公司论坛；刷新后重置。');
  }
  return <section className="workspace-content">
    <div className="workspace-heading"><div><p className="eyebrow">知识协作</p><h1>交流与协作</h1></div><Button onClick={()=>setComposing(true)}><Plus/>发起话题</Button></div>
    <div className="collaboration-intro"><div><h2>把需求说出来，把经验留下来</h2><p>找资源、问方法、分享项目经验，让同事的经验成为下一步的帮助。</p></div><span className="preview-badge">论坛未连接 · 本页演示</span></div>
    <div className="knowledge-tools"><Tabs value={category} onValueChange={v=>setCategory(String(v))}><TabsList className="h-10 max-w-full overflow-x-auto">{['全部','需求交流','资源对接','经验分享'].map(c=><TabsTrigger key={c} value={c} className="px-3">{c}</TabsTrigger>)}</TabsList></Tabs><div className="search-field"><Search size={18}/><Input aria-label="搜索话题" placeholder="搜索话题" value={query} onChange={e=>setQuery(e.target.value)}/></div></div>
    {notice && <p className="inline-notice" role="status">{notice}</p>}
    <div className="topic-list">{visible.map(t=><button className="topic-row" key={t.id} onClick={()=>{setSelectedId(t.id);setReply('');}}><span className="topic-avatar"><MessageSquare size={21}/></span><span className="topic-main"><span className="topic-labels"><span>{t.category}</span><span>{t.status}</span></span><strong>{t.title}</strong><span className="topic-excerpt">{t.body}</span><span className="topic-meta">{t.author} · {t.replies.length} 条回复</span></span><ArrowUpRight size={18}/></button>)}</div>
    {!visible.length && <div className="module-empty"><MessageSquare size={28}/><h2>暂无匹配话题</h2><p>换个关键词，或发起一个本页演示话题。</p></div>}
    <p className="module-footnote">示例话题与回复均为演示内容。新增内容仅保留在本页，不发送通知，不同步到论坛或知识库。</p>
    <Dialog open={composing} onOpenChange={setComposing}><DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto p-7"><DialogHeader><DialogTitle>发起话题</DialogTitle><DialogDescription>仅用于本页体验，刷新后重置；不会发布到公司论坛。</DialogDescription></DialogHeader><form className="compose-form" onSubmit={e=>{e.preventDefault();addTopic();}}><label>话题分类<select value={topicCategory} onChange={e=>setTopicCategory(e.target.value)}>{['需求交流','资源对接','经验分享'].map(c=><option key={c}>{c}</option>)}</select></label><label>标题<Input required maxLength={100} value={title} onChange={e=>setTitle(e.target.value)} placeholder="一句话说清你想交流的事情"/></label><label>内容<Textarea required maxLength={5000} rows={5} value={body} onChange={e=>setBody(e.target.value)} placeholder="补充背景、需求和已有资料…"/></label><Button type="submit" disabled={!title.trim()||!body.trim()}>加入本页演示</Button></form></DialogContent></Dialog>
    <Dialog open={!!selected} onOpenChange={open=>{if(!open)setSelectedId(null);}}><DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto p-7"><DialogHeader><DialogTitle className="pr-6 text-xl leading-8">{selected?.title}</DialogTitle><DialogDescription>{selected?.category} · {selected?.author} · {selected?.status}</DialogDescription></DialogHeader><p className="whitespace-pre-wrap text-base leading-8">{selected?.body}</p><div className="forum-replies"><h3>回复 · {selected?.replies.length ?? 0}</h3>{selected?.replies.map((text,i)=><p key={i}><span>参与者 {i+1}（演示）</span>{text}</p>)}{!selected?.replies.length && <p>暂无回复，可以补充你的想法。</p>}</div><form className="compose-form" onSubmit={e=>{e.preventDefault();if(!reply.trim())return;setTopics(items=>items.map(t=>t.id===selectedId?{...t,replies:[...t.replies,reply.trim()]}:t));setReply('');}}><label>补充回复<Textarea rows={3} maxLength={2000} value={reply} onChange={e=>setReply(e.target.value)} placeholder="仅保留在本页，不发送给其他同事"/></label><Button type="submit" disabled={!reply.trim()}>添加演示回复</Button></form></DialogContent></Dialog>
  </section>;
}
