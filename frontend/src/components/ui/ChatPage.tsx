"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import Sidebar from "../Sidebar";
import ChatWindow from "../ChatWindow";
import EmptyState from "../EmptyState";
import InputBar from "../InputBar";
import logo from "../../assets/logo.png";

const subjectMeta = {
  Math: { icon: "\u2211", color: "subject-math", tag: "Math" },
  Physics: { icon: "\u03A6", color: "subject-physics", tag: "Physics" },
  Chemistry: { icon: "\u2697", color: "subject-chemistry", tag: "Chemistry" },
  Biology: { icon: "\u267F", color: "subject-biology", tag: "Biology" },
};

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

const initialConversations = [
  {
    id: "conv_1",
    subject: "Math",
    chapter: "Quadratic Equations",
    firstMessage: "I'm stuck on quadratic equations: x\u00b2 + 5x + 6 = 0. I keep getting the signs wrong.",
    lastMessage: "Let's try solving it step by step...",
    time: "2m ago",
    unread: 2,
    progress: 80,
    messages: [
      { id: "m1", role: "student", content: "I'm stuck on quadratic equations: x\u00b2 + 5x + 6 = 0. I keep getting the signs wrong.", timestamp: "10:32 AM" },
      { id: "m2", role: "tutor", content: "Great question! Let's walk through it together. First, can you tell me what the **quadratic formula** looks like?", timestamp: "10:33 AM" },
      { id: "m3", role: "student", content: "x = (-b \u00b1 \u221a(b\u00b2 - 4ac)) / 2a", timestamp: "10:34 AM" },
      { id: "m4", role: "tutor", content: "Perfect! Now let's identify a, b, c in your equation:\n\n$$x^2 + 5x + 6 = 0$$\n\nHere, $a = 1$, $b = 5$, $c = 6$.\n\nTry plugging these into the formula. What do you get for the discriminant ($b^2 - 4ac$)?", timestamp: "10:35 AM" },
      { id: "m5", role: "student", content: "b\u00b2 - 4ac = 25 - 24 = 1. So \u221a1 = 1. Then x = (-5 \u00b1 1) / 2, so x = -2 or x = -3!", timestamp: "10:37 AM" },
      { id: "m6", role: "tutor", content: "Excellent work! \u2B50 You got it right! The roots are $x = -2$ and $x = -3$.\n\nWant to try another one?", timestamp: "10:38 AM" },
    ],
  },
  {
    id: "conv_2",
    subject: "Physics",
    chapter: "Kinematics",
    firstMessage: "I'm confused about equations of motion. When do I use v\u00b2 = u\u00b2 + 2as vs s = ut + \u00bdat\u00b2?",
    lastMessage: "Great question! The key is to look at which variables you know...",
    time: "1h ago",
    unread: 0,
    progress: 45,
    messages: [
      { id: "n1", role: "student", content: "I'm confused about equations of motion. When do I use v\u00b2 = u\u00b2 + 2as vs s = ut + \u00bdat\u00b2?", timestamp: "9:00 AM" },
      { id: "n2", role: "tutor", content: "Great question! The key is to look at which variables you **know** and which you **need**.\n\n$v^2 = u^2 + 2as$ is useful when **time** is not involved.\n$s = ut + \\frac{1}{2}at^2$ is used when you know the **time**.\n\nWant me to walk through an example?", timestamp: "9:02 AM" },
    ],
  },
];

interface ChatPageProps {
  onBack?: () => void;
}

const ChatPage = ({ onBack }: ChatPageProps) => {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const activeConversation = conversations.find((c) => c.id === activeConvId) || null;

  function handleSelectConversation(id: string) {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
    setActiveConvId(id);
    setMobileSidebarOpen(false);
  }

  function handleNewChat() {
    setActiveConvId(null);
  }

  function handleMarkSolved() {
    setConversations((prev) => prev.map((c) => (c.id === activeConvId ? { ...c, solved: !c.solved } : c)));
  }

  function handleMessageSent(convId: string, message: string) {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? {
              ...c,
              lastMessage: message,
              time: "Just now",
              messages: [
                ...c.messages,
                {
                  id: Date.now().toString(),
                  role: "student",
                  content: message,
                  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                },
              ],
            }
          : c
      )
    );
  }

  function handleTutorReply(convId: string, reply: string) {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? {
              ...c,
              lastMessage: reply,
              time: "Just now",
              messages: [
                ...c.messages,
                {
                  id: Date.now().toString(),
                  role: "tutor",
                  content: reply,
                  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                },
              ],
            }
          : c
      )
    );
  }

  function handleSendFromApp(text: string) {
    if (activeConversation) {
      handleMessageSent(activeConvId!, text);
      setTimeout(() => {
        const replies = [
          "Great question! Let's break this down step by step...",
          "Excellent thinking! Here's how this connects to what you know...",
          "I see where you're going. The key insight is...",
          "Perfect! Let's build on that with a concrete example...",
          "You're on the right track! Here's the framework...",
        ];
        const reply = replies[Math.floor(Math.random() * replies.length)];
        handleTutorReply(activeConvId!, reply);
      }, 1800 + Math.random() * 1200);
    } else {
      const newId = "conv_new_" + Date.now();
      const newConv = {
        id: newId,
        subject: "Math",
        chapter: "New Session",
        firstMessage: text,
        lastMessage: text,
        time: "Just now",
        unread: 0,
        progress: 0,
        messages: [
          {
            id: Date.now().toString(),
            role: "student",
            content: text,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ],
      };
      setConversations((prev) => [...prev, newConv]);
      setActiveConvId(newId);
    }
  }

  return (
    <div className="h-screen bg-[#0c0414] text-white flex flex-col relative overflow-hidden">
      {/* Gradient effects */}
      <div className="flex gap-[6rem] md:gap-[10rem] rotate-[-20deg] absolute top-[-30rem] md:top-[-40rem] right-[-20rem] md:right-[-30rem] z-[0] blur-[2rem] md:blur-[4rem] skew-[-40deg] opacity-30 md:opacity-50">
        <div className="w-[6rem] md:w-[10rem] h-[12rem] md:h-[20rem] bg-linear-90 from-white to-blue-300"></div>
        <div className="w-[6rem] md:w-[10rem] h-[12rem] md:h-[20rem] bg-linear-90 from-white to-blue-300"></div>
        <div className="w-[6rem] md:w-[10rem] h-[12rem] md:h-[20rem] bg-linear-90 from-white to-blue-300"></div>
      </div>
      <div className="flex gap-[6rem] md:gap-[10rem] rotate-[-20deg] absolute top-[-40rem] md:top-[-50rem] right-[-35rem] md:right-[-50rem] z-[0] blur-[2rem] md:blur-[4rem] skew-[-40deg] opacity-30 md:opacity-50">
        <div className="w-[6rem] md:w-[10rem] h-[12rem] md:h-[20rem] bg-linear-90 from-white to-blue-300"></div>
        <div className="w-[6rem] md:w-[10rem] h-[12rem] md:h-[20rem] bg-linear-90 from-white to-blue-300"></div>
        <div className="w-[6rem] md:w-[10rem] h-[12rem] md:h-[20rem] bg-linear-90 from-white to-blue-300"></div>
      </div>
      <div className="flex gap-[6rem] md:gap-[10rem] rotate-[-20deg] absolute top-[-45rem] md:top-[-60rem] right-[-40rem] md:right-[-60rem] z-[0] blur-[2rem] md:blur-[4rem] skew-[-40deg] opacity-30 md:opacity-50">
        <div className="w-[8rem] md:w-[10rem] h-[20rem] md:h-[30rem] bg-linear-90 from-white to-blue-300"></div>
        <div className="w-[8rem] md:w-[10rem] h-[20rem] md:h-[30rem] bg-linear-90 from-white to-blue-300"></div>
        <div className="w-[8rem] md:w-[10rem] h-[20rem] md:h-[30rem] bg-linear-90 from-white to-blue-300"></div>
      </div>

      {/* Header */}
      <header className="flex justify-between items-center px-4 md:px-6 py-3 md:py-4 relative z-[3] flex-shrink-0">
        <div className="flex items-center gap-2">
          <img src={logo} alt="VidyaLoop" className="w-5 h-5 md:w-7 md:h-7 object-contain" />
          <div className="font-bold text-xs md:text-sm">VidyaLoop</div>
        </div>
        <button
          onClick={onBack}
          className="bg-white/10 hover:bg-white/20 text-white rounded-full px-3 py-1.5 text-xs md:text-sm cursor-pointer font-semibold transition-all"
        >
          Home
        </button>
      </header>

      {/* Mobile sidebar backdrop */}
      {mobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* Sidebar - desktop */}
      <div className="hidden md:block w-[260px] flex-shrink-0 h-full relative z-[2]">
        <Sidebar conversations={conversations} subjectMeta={subjectMeta} activeConvId={activeConvId} onSelectConversation={handleSelectConversation} onNewChat={handleNewChat} />
      </div>

      {/* Sidebar - mobile overlay */}
      <div className={`fixed md:static inset-y-0 left-0 z-50 w-[260px] h-full transition-transform duration-300 ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"} md:hidden`}>
        <Sidebar conversations={conversations} subjectMeta={subjectMeta} activeConvId={activeConvId} onSelectConversation={handleSelectConversation} onNewChat={handleNewChat} onClose={() => setMobileSidebarOpen(false)} />
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative z-[2]">
        {/* Mobile hamburger */}
        {!activeConversation && (
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="md:hidden fixed top-3 left-3 z-30 w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 backdrop-blur border shadow-lg"
            style={{
              color: "rgba(255,255,255,0.5)",
              background: "rgba(255,255,255,0.04)",
              borderColor: "rgba(255,255,255,0.06)",
            }}
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
        )}

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
              />
            ) : (
              <EmptyState subjectMeta={subjectMeta} onSelect={handleSelectConversation} conversations={initialConversations} />
            )}
          </div>

          {!activeConversation && (
            <div className="flex-shrink-0 px-4 pb-3 pt-2">
              <div className="max-w-5xl mx-auto">
                <InputBar onSend={handleSendFromApp} disabled={false} conversationId="new" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { ChatPage };
