"use client";

import * as React from "react";
import { useState, useRef, useCallback } from "react";
import { Menu, GraduationCap, Plus, X, BookOpen, Sparkles } from "lucide-react";
import { Canvas } from "@react-three/fiber";
import { Environment, ContactShadows } from "@react-three/drei";
import { RobotPrototype, ResponsiveGroup } from "./robot-hero";
import Sidebar from "../Sidebar";
import ChatWindow from "../ChatWindow";
import EmptyState from "../EmptyState";
import InputBar from "../InputBar";
import { streamChat, generateSessionId } from "../../services/api";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Generate a consistent color class + icon for any subject string */
function getSubjectMeta(subject: string): { icon: string; color: string; tag: string } {
  const known: Record<string, { icon: string; color: string; tag: string }> = {
    Math:        { icon: "∑",  color: "subject-math",      tag: "Math"      },
    Physics:     { icon: "Φ",  color: "subject-physics",   tag: "Physics"   },
    Chemistry:   { icon: "⚗", color: "subject-chemistry", tag: "Chemistry" },
    Biology:     { icon: "♿", color: "subject-biology",   tag: "Biology"   },
  };
  if (known[subject]) return known[subject];

  // Dynamic fallback: pick a color based on string hash
  const colors = [
    "subject-math", "subject-physics", "subject-chemistry", "subject-biology",
  ];
  const icons = ["📘", "🔬", "📐", "💡", "🌐", "🎯", "🧠", "📊", "🔭", "✏️"];
  const hash = [...subject].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return {
    icon:  icons[hash % icons.length],
    color: colors[hash % colors.length],
    tag:   subject,
  };
}

// ── Types ────────────────────────────────────────────────────────────────────
interface Conversation {
  id: string;
  subject: string;
  chapter: string;
  firstMessage: string;
  lastMessage: string;
  time: string;
  unread: number;
  progress: number;
  solved?: boolean;
  messages: { id: string; role: string; content: string; timestamp: string }[];
}

// ── Static data ───────────────────────────────────────────────────────────────
const userProfile = {
  id: "user_1",
  name: "Priya",
  initials: "PS",
  role: "Student",
  classLevel: 11,
  streak: 5,
  xp: 1280,
  level: 7,
};

const initialConversations: Conversation[] = [
  {
    id: "conv_1",
    subject: "Math",
    chapter: "Quadratic Equations",
    firstMessage: "I'm stuck on quadratic equations: x² + 5x + 6 = 0. I keep getting the signs wrong.",
    lastMessage: "Let's try solving it step by step...",
    time: "2m ago",
    unread: 2,
    progress: 80,
    messages: [
      { id: "m1", role: "student", content: "I'm stuck on quadratic equations: x² + 5x + 6 = 0. I keep getting the signs wrong.", timestamp: "10:32 AM" },
      { id: "m2", role: "tutor",   content: "Great question! Let's walk through it together. First, can you tell me what the **quadratic formula** looks like?", timestamp: "10:33 AM" },
      { id: "m3", role: "student", content: "x = (-b ± √(b² - 4ac)) / 2a", timestamp: "10:34 AM" },
      { id: "m4", role: "tutor",   content: "Perfect! Now let's identify a, b, c in your equation:\n\n$$x^2 + 5x + 6 = 0$$\n\nHere, $a = 1$, $b = 5$, $c = 6$.\n\nTry plugging these into the formula. What do you get for the discriminant ($b^2 - 4ac$)?", timestamp: "10:35 AM" },
      { id: "m5", role: "student", content: "b² - 4ac = 25 - 24 = 1. So √1 = 1. Then x = (-5 ± 1) / 2, so x = -2 or x = -3!", timestamp: "10:37 AM" },
      { id: "m6", role: "tutor",   content: "Excellent work! ⭐ You got it right! The roots are $x = -2$ and $x = -3$.\n\nWant to try another one?", timestamp: "10:38 AM" },
    ],
  },
  {
    id: "conv_2",
    subject: "Physics",
    chapter: "Kinematics",
    firstMessage: "I'm confused about equations of motion. When do I use v² = u² + 2as vs s = ut + ½at²?",
    lastMessage: "Great question! The key is to look at which variables you know...",
    time: "1h ago",
    unread: 0,
    progress: 45,
    messages: [
      { id: "n1", role: "student", content: "I'm confused about equations of motion. When do I use v² = u² + 2as vs s = ut + ½at²?", timestamp: "9:00 AM" },
      { id: "n2", role: "tutor",   content: "Great question! The key is to look at which variables you **know** and which you **need**.\n\n$v^2 = u^2 + 2as$ is useful when **time** is not involved.\n$s = ut + \\frac{1}{2}at^2$ is used when you know the **time**.\n\nWant me to walk through an example?", timestamp: "9:02 AM" },
    ],
  },
];

// ── New Topic Modal ───────────────────────────────────────────────────────────
function NewTopicModal({ onClose, onCreate }: { onClose: () => void; onCreate: (subject: string, topic: string) => void }) {
  const [subject, setSubject] = useState("");
  const [topic, setTopic]     = useState("");

  const suggestions = ["Math", "Physics", "Chemistry", "Biology", "History", "Geography", "English", "Economics", "Computer Science", "Hindi"];

  function handleCreate() {
    const s = subject.trim();
    const t = topic.trim();
    if (!s) return;
    onCreate(s, t || `Intro to ${s}`);
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 80, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-5 flex flex-col gap-4"
        style={{
          background: "linear-gradient(135deg, rgba(20,12,36,0.98) 0%, rgba(14,8,26,0.98) 100%)",
          border: "1px solid rgba(0,255,198,0.18)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.7), 0 0 40px rgba(0,255,198,0.06)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,255,198,0.1)", border: "1px solid rgba(0,255,198,0.2)" }}>
              <Plus size={15} className="text-[#00ffc6]" />
            </div>
            <span className="font-bold text-sm text-white/90">New Topic</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/5 transition-all">
            <X size={14} />
          </button>
        </div>

        {/* Subject input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Subject</label>
          <input
            autoFocus
            type="text"
            placeholder="e.g. Math, History, English..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none placeholder:text-white/20 text-white/85"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          />
          {/* Quick-pick subject chips */}
          <div className="flex flex-wrap gap-1 mt-1">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => setSubject(s)}
                className="text-[9px] font-medium px-2 py-1 rounded-lg transition-all"
                style={{
                  background: subject === s ? "rgba(0,255,198,0.15)" : "rgba(255,255,255,0.04)",
                  color:      subject === s ? "#00ffc6" : "rgba(255,255,255,0.4)",
                  border:     subject === s ? "1px solid rgba(0,255,198,0.25)" : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Topic/Chapter input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Topic / Chapter <span className="normal-case text-white/25">(optional)</span></label>
          <input
            type="text"
            placeholder="e.g. Quadratic Equations, World War II..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none placeholder:text-white/20 text-white/85"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          />
        </div>

        {/* Create button */}
        <button
          onClick={handleCreate}
          disabled={!subject.trim()}
          className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-[0.98]"
          style={{
            background: subject.trim() ? "linear-gradient(135deg, #00ffc6 0%, #00cca2 100%)" : "rgba(255,255,255,0.05)",
            color:      subject.trim() ? "#071a14" : "rgba(255,255,255,0.2)",
            boxShadow:  subject.trim() ? "0 4px 20px rgba(0,255,198,0.25)" : "none",
            cursor:     subject.trim() ? "pointer" : "not-allowed",
          }}
        >
          Start Learning →
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
const Hero1 = () => {
  const [isChatMode,        setIsChatMode]        = useState(false);
  const [searchText,        setSearchText]        = useState("");
  const [conversations,     setConversations]     = useState<Conversation[]>(initialConversations);
  const [activeConvId,      setActiveConvId]      = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showNewTopicModal, setShowNewTopicModal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeConversation = conversations.find((c) => c.id === activeConvId) || null;

  /** Build a subjectMeta map dynamically from all conversations */
  const subjectMeta = React.useMemo(() => {
    const map: Record<string, { icon: string; color: string; tag: string }> = {};
    conversations.forEach((c) => {
      if (!map[c.subject]) map[c.subject] = getSubjectMeta(c.subject);
    });
    return map;
  }, [conversations]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchText.trim()) setIsChatMode(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchText.trim()) setIsChatMode(true);
  };

  function handleSelectConversation(id: string) {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
    setActiveConvId(id);
    setMobileSidebarOpen(false);
  }

  /** "New Topic" button → open modal */
  function handleNewChat() {
    setShowNewTopicModal(true);
  }

  /** Called when user submits the new-topic modal */
  function handleCreateTopic(subjectName: string, topicName: string) {
    setShowNewTopicModal(false);
    const newId = generateSessionId();
    const newConv: Conversation = {
      id:           newId,
      subject:      subjectName,
      chapter:      topicName,
      firstMessage: `Let's start learning ${topicName}!`,
      lastMessage:  `Ask me anything about ${topicName}.`,
      time:         "Just now",
      unread:       0,
      progress:     0,
      messages: [
        {
          id:        Date.now().toString(),
          role:      "tutor",
          content:   `Hello! I'm your VidyaLoop AI tutor. You've chosen **${subjectName} — ${topicName}**. 🎯\n\nWhat would you like to explore? You can ask me to:\n- **Explain** a concept\n- **Solve** a problem step-by-step\n- **Quiz** you on this topic\n- **Summarise** the chapter`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ],
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveConvId(newId);
    setIsChatMode(true);
  }

  function handleSelectSubject(subjectName: string) {
    setIsChatMode(true);
    const existing = conversations.find((c) => c.subject === subjectName);
    if (existing) {
      handleSelectConversation(existing.id);
    } else {
      handleCreateTopic(subjectName, `Intro to ${subjectName}`);
    }
  }

  function handleMarkSolved() {
    setConversations((prev) => prev.map((c) => (c.id === activeConvId ? { ...c, solved: !c.solved } : c)));
  }

  function handleMessageSent(convId: string, message: string) {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? { ...c, lastMessage: message, time: "Just now", messages: [...c.messages, { id: Date.now().toString(), role: "student", content: message, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }] }
          : c
      )
    );
  }

  function handleTutorReply(convId: string, reply: string) {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? { ...c, lastMessage: reply, time: "Just now", messages: [...c.messages, { id: Date.now().toString(), role: "tutor", content: reply, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }] }
          : c
      )
    );
  }

  const handleSendFromApp = useCallback((text: string) => {
    if (activeConversation) {
      sendMessageAndStream(activeConvId!, text);
    } else {
      // Start a new session from the empty-state input bar
      const newId = generateSessionId();
      const newConv: Conversation = {
        id: newId,
        subject: "General",
        chapter: text.substring(0, 50),
        firstMessage: text,
        lastMessage: text,
        time: "Just now",
        unread: 0,
        progress: 0,
        messages: [],
      };
      setConversations((prev) => [newConv, ...prev]);
      setActiveConvId(newId);
      sendMessageAndStream(newId, text);
    }
  }, [activeConversation, activeConvId]);

  async function sendMessageAndStream(convId: string, text: string) {
    // Add user message
    const userMsgId = Date.now().toString();
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? { ...c, lastMessage: text, time: "Just now", messages: [...c.messages, { id: userMsgId, role: "student", content: text, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }] }
          : c
      )
    );

    // Add empty placeholder for the streaming response
    const tutorPlaceholderId = (Date.now() + 1).toString();
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? { ...c, messages: [...c.messages, { id: tutorPlaceholderId, role: "tutor", content: "", timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }] }
          : c
      )
    );

    let accumulated = "";
    await streamChat(convId, text, {
      onToken: (token) => {
        accumulated += token;
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? { ...c, messages: c.messages.map((m) => (m.id === tutorPlaceholderId ? { ...m, content: accumulated } : m)) }
              : c
          )
        );
      },
      onDone: () => {},
      onError: (error) => {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? { ...c, messages: c.messages.map((m) => (m.id === tutorPlaceholderId ? { ...m, content: accumulated || `Error: ${error}` } : m)) }
              : c
          )
        );
      },
    });
  }

  return (
    <div className="h-screen bg-[#0c0414] text-white flex flex-col relative overflow-hidden">
      {/* Gradient blobs */}
      <div className="flex gap-[6rem] md:gap-[10rem] rotate-[-20deg] absolute top-[-30rem] md:top-[-40rem] right-[-20rem] md:right-[-30rem] z-[0] blur-[2rem] md:blur-[4rem] skew-[-40deg] opacity-30 md:opacity-50">
        <div className="w-[6rem] md:w-[10rem] h-[12rem] md:h-[20rem] bg-linear-90 from-white to-blue-300" />
        <div className="w-[6rem] md:w-[10rem] h-[12rem] md:h-[20rem] bg-linear-90 from-white to-blue-300" />
        <div className="w-[6rem] md:w-[10rem] h-[12rem] md:h-[20rem] bg-linear-90 from-white to-blue-300" />
      </div>
      <div className="flex gap-[6rem] md:gap-[10rem] rotate-[-20deg] absolute top-[-40rem] md:top-[-50rem] right-[-35rem] md:right-[-50rem] z-[0] blur-[2rem] md:blur-[4rem] skew-[-40deg] opacity-30 md:opacity-50">
        <div className="w-[6rem] md:w-[10rem] h-[12rem] md:h-[20rem] bg-linear-90 from-white to-blue-300" />
        <div className="w-[6rem] md:w-[10rem] h-[12rem] md:h-[20rem] bg-linear-90 from-white to-blue-300" />
        <div className="w-[6rem] md:w-[10rem] h-[12rem] md:h-[20rem] bg-linear-90 from-white to-blue-300" />
      </div>
      <div className="flex gap-[6rem] md:gap-[10rem] rotate-[-20deg] absolute top-[-45rem] md:top-[-60rem] right-[-40rem] md:right-[-60rem] z-[0] blur-[2rem] md:blur-[4rem] skew-[-40deg] opacity-30 md:opacity-50">
        <div className="w-[8rem] md:w-[10rem] h-[20rem] md:h-[30rem] bg-linear-90 from-white to-blue-300" />
        <div className="w-[8rem] md:w-[10rem] h-[20rem] md:h-[30rem] bg-linear-90 from-white to-blue-300" />
        <div className="w-[8rem] md:w-[10rem] h-[20rem] md:h-[30rem] bg-linear-90 from-white to-blue-300" />
      </div>

      {/* Robot (desktop only, landing) */}
      <div className={`hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-[280px] lg:w-[380px] xl:w-[450px] h-[280px] lg:h-[380px] xl:h-[450px] ${isChatMode ? "z-[0]" : "z-[10]"}`}>
        <Canvas shadows camera={{ position: [0, 0.2, 6], fov: 40 }}>
          <ambientLight intensity={0.75} color="#ffffff" />
          <directionalLight position={[0, 6, 3]} intensity={0.4} color="#00ffe2" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0005}>
            <orthographicCamera attach="shadow-camera" args={[-1.5, 1.5, 1.5, -1.5, 0.1, 20]} />
          </directionalLight>
          <directionalLight position={[-5, 2, -5]} intensity={0.15} color="#dbdbdb" />
          <Environment preset="studio" blur={0.5} />
          <ResponsiveGroup>
            <group>
              <ContactShadows position={[0, -0.79, 0]} opacity={0.4} scale={15} resolution={1024} blur={1.7} far={2.5} color="#000000" />
              <RobotPrototype
                neckParams={{ baseR: 0.215, baseH: -0.050, midR: 0.280, midH: 0.020, lipBottomR: 0.295, lipBottomH: 0.045, lipTopR: 0.270, lipTopH: 0.055, innerR: 0.100, innerDropH: 0.000 }}
                bodyParams={{ bodyBevelR: 0.235, bodyBevelY: 0.340, bodyBevelT: 0.025 }}
                moveRange={isChatMode ? 0.2 : 1}
              />
            </group>
          </ResponsiveGroup>
        </Canvas>
      </div>

      {/* Landing header */}
      {!isChatMode && (
        <header className="flex justify-between items-center px-4 md:px-6 py-3 md:py-4 relative z-[3] flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-tr from-[#00ffc6] to-[#00cca2] shadow-[0_0_12px_rgba(0,255,198,0.25)]">
              <GraduationCap className="w-4 h-4 text-[#0c0414]" strokeWidth={2.5} />
            </div>
            <div className="font-bold text-xs md:text-sm tracking-wide text-white/90">VidyaLoop</div>
          </div>
          <button
            onClick={() => setIsChatMode(true)}
            className="bg-white text-black hover:bg-gray-200 rounded-full px-3 py-1.5 text-xs md:text-sm cursor-pointer font-semibold"
          >
            Get Started
          </button>
        </header>
      )}

      {/* New Topic Modal */}
      {showNewTopicModal && (
        <NewTopicModal
          onClose={() => setShowNewTopicModal(false)}
          onCreate={handleCreateTopic}
        />
      )}

      {/* Mobile sidebar backdrop */}
      {isChatMode && mobileSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm"
          style={{ zIndex: 55 }}
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar overlay */}
      {isChatMode && (
        <div
          className={`md:hidden fixed inset-y-0 left-0 h-full w-[260px] transition-transform duration-300 ease-in-out ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
          style={{ zIndex: 60 }}
        >
          <Sidebar
            conversations={conversations}
            subjectMeta={subjectMeta}
            activeConvId={activeConvId}
            onSelectConversation={handleSelectConversation}
            onNewChat={handleNewChat}
            onClose={() => setMobileSidebarOpen(false)}
            onHome={() => { setIsChatMode(false); setActiveConvId(null); }}
          />
        </div>
      )}

      {/* Mobile hamburger (only when sidebar closed) */}
      {isChatMode && !mobileSidebarOpen && (
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="md:hidden fixed top-3 left-3 w-10 h-10 rounded-xl flex items-center justify-center active:scale-90 transition-all duration-200"
          style={{
            zIndex: 65,
            color: "rgba(255,255,255,0.75)",
            background: "rgba(20,15,35,0.85)",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          }}
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>
      )}

      {/* Main area */}
      <div className="flex-1 flex min-h-0 relative z-[2]">
        {isChatMode ? (
          <>
            {/* Desktop sidebar */}
            <div className="hidden md:flex w-[260px] flex-shrink-0 h-full">
              <Sidebar
                conversations={conversations}
                subjectMeta={subjectMeta}
                activeConvId={activeConvId}
                onSelectConversation={handleSelectConversation}
                onNewChat={handleNewChat}
                onHome={() => { setIsChatMode(false); setActiveConvId(null); }}
              />
            </div>

            {/* Chat area */}
            <div className="flex-1 flex flex-col min-w-0 h-full">
              <div className="md:hidden h-14 flex-shrink-0" />

              <div className="relative flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-hidden">
                  {activeConversation ? (
                    <ChatWindow
                      key={activeConvId}
                      conversation={activeConversation}
                      subjectMeta={subjectMeta}
                      userProfile={userProfile}
                      onMessageSent={handleMessageSent}
                      onTutorReply={handleTutorReply}
                      onMarkSolved={handleMarkSolved}
                      onMenuToggle={() => setMobileSidebarOpen(true)}
                      onApiSend={sendMessageAndStream}
                    />
                  ) : (
                    <EmptyState
                      subjectMeta={subjectMeta}
                      onSelect={handleSelectConversation}
                      conversations={initialConversations}
                      onSelectSubject={handleSelectSubject}
                      onNewTopic={handleNewChat}
                    />
                  )}
                </div>

                {!activeConversation && (
                  <div className="flex-shrink-0 px-4 pb-3 pt-2" style={{ background: "rgba(10,4,18,0.9)" }}>
                    <div className="max-w-3xl mx-auto">
                      <InputBar onSend={handleSendFromApp} disabled={false} conversationId="new" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Landing */
          <main className="flex-1 flex items-center justify-start md:justify-center px-4 md:px-6 text-center relative z-[3] min-h-0">
            <div className="max-w-3xl mx-auto w-full flex flex-col items-center justify-center gap-4 md:gap-5 lg:gap-6">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight drop-shadow-[0_0_20px_rgba(0,255,198,0.25)]">
                Master any subject with VidyaLoop
              </h1>

              <p className="text-xs sm:text-sm md:text-base lg:text-lg text-white/60 max-w-xl">
                Your AI-powered personal tutor for every school and college subject — Math, Physics, History, Languages, and more.
              </p>

              <div className="relative w-full max-w-lg md:max-w-xl mt-2 md:mt-3">
                <form onSubmit={handleSearch}>
                  <div className="bg-[#1c1528] rounded-full p-2 md:p-2.5 flex items-center shadow-[0_0_30px_rgba(0,255,198,0.08)] ring-1 ring-white/5">
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Ask anything — Maths, History, English, Science..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="bg-transparent flex-1 outline-none text-gray-300 pl-2 md:pl-3 text-xs md:text-sm"
                    />
                  </div>
                </form>
              </div>

              <div className="flex flex-wrap justify-center gap-1.5 md:gap-2 max-w-lg md:max-w-xl">
                {[
                  "Solve quadratic equation x² + 5x + 6 = 0",
                  "Explain Newton's Laws of Motion",
                  "Causes of World War II",
                  "How does cellular respiration work?",
                  "Help me with essay writing",
                ].map((t) => (
                  <button
                    key={t}
                    onClick={() => { setSearchText(t); setIsChatMode(true); }}
                    className="bg-[#1c1528] hover:bg-[#2a1f3d] rounded-full px-2.5 py-1 md:px-3 md:py-1.5 text-[9px] md:text-xs transition-all cursor-pointer"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </main>
        )}
      </div>
    </div>
  );
};

export { Hero1 };
