// lib/store.ts
import { v4 as uuidv4 } from 'uuid';

export interface ChatThread {
  threadId: string;
  title: string;
  status: 'active' | 'archived';
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface Diary {
  id: string;
  threadId: string;
  title: string;
  mood: string;
  content: string;
  summary: string;
  createdAt: string;
}

class InMemoryStore {
  private threads: Map<string, ChatThread> = new Map();
  private messages: Map<string, ChatMessage> = new Map();
  private diaries: Map<string, Diary> = new Map();

  // Chat Threads
  createThread(title?: string): ChatThread {
    const thread: ChatThread = {
      threadId: uuidv4(),
      title: title || `Thread ${this.threads.size + 1}`,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    this.threads.set(thread.threadId, thread);
    return thread;
  }

  getThread(id: string): ChatThread | undefined {
    return this.threads.get(id);
  }

  listThreads(status: 'active' | 'archived' = 'active', limit: number = 20, cursor?: string) {
    const threads = Array.from(this.threads.values())
      .filter(t => t.status === status)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    let startIndex = 0;
    if (cursor) {
      startIndex = threads.findIndex(t => t.threadId === cursor) + 1;
    }

    const items = threads.slice(startIndex, startIndex + limit);
    const nextCursor = items.length === limit ? items[items.length - 1].threadId : null;

    return { items, nextCursor };
  }

  updateThreadStatus(id: string, status: 'active' | 'archived'): boolean {
    const thread = this.threads.get(id);
    if (!thread) return false;
    thread.status = status;
    return true;
  }

  deleteThread(id: string): boolean {
    return this.threads.delete(id);
  }

  // Chat Messages
  createMessage(threadId: string, content: string, role: 'user' | 'assistant' = 'user'): ChatMessage | null {
    const thread = this.threads.get(threadId);
    if (!thread || thread.status === 'archived') return null;

    const message: ChatMessage = {
      id: uuidv4(),
      threadId,
      role,
      content,
      createdAt: new Date().toISOString(),
    };
    this.messages.set(message.id, message);
    return message;
  }

  getMessage(id: string): ChatMessage | undefined {
    return this.messages.get(id);
  }

  listMessages(threadId: string, limit: number = 50, cursor?: string) {
    const messages = Array.from(this.messages.values())
      .filter(m => m.threadId === threadId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    let startIndex = 0;
    if (cursor) {
      startIndex = messages.findIndex(m => m.id === cursor) + 1;
    }

    const items = messages.slice(startIndex, startIndex + limit);
    const nextCursor = items.length === limit ? items[items.length - 1].id : null;

    return { items, nextCursor };
  }

  updateMessage(id: string, content: string): boolean {
    const message = this.messages.get(id);
    if (!message) return false;
    
    const thread = this.threads.get(message.threadId);
    if (!thread || thread.status === 'archived') return false;

    message.content = content;
    return true;
  }

  deleteMessage(id: string): boolean {
    const message = this.messages.get(id);
    if (!message) return false;
    
    const thread = this.threads.get(message.threadId);
    if (!thread || thread.status === 'archived') return false;

    return this.messages.delete(id);
  }

  // Diaries
  createDiary(threadId: string, title: string, mood: string, content: string, summary: string): Diary | null {
    const thread = this.threads.get(threadId);
    if (!thread) return null;

    const diary: Diary = {
      id: uuidv4(),
      threadId,
      title,
      mood,
      content,
      summary,
      createdAt: new Date().toISOString(),
    };
    this.diaries.set(diary.id, diary);
    return diary;
  }

  getDiary(id: string): Diary | undefined {
    return this.diaries.get(id);
  }

  listDiaries(threadId: string, limit: number = 20, cursor?: string) {
    const diaries = Array.from(this.diaries.values())
      .filter(d => d.threadId === threadId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    let startIndex = 0;
    if (cursor) {
      startIndex = diaries.findIndex(d => d.id === cursor) + 1;
    }

    const items = diaries.slice(startIndex, startIndex + limit);
    const nextCursor = items.length === limit ? items[items.length - 1].id : null;

    return { items, nextCursor };
  }
}

export const store = new InMemoryStore();