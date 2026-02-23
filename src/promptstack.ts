import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

export interface PromptVersion {
  id: string;
  promptId: string;
  version: number;
  content: string;
  metadata: {
    model?: string;
    temperature?: number;
    notes?: string;
    tags?: string[];
  };
  createdAt: string;
  performance?: {
    rating?: number; // 1-5 stars
    tokens?: number;
    latency?: number;
  };
}

export interface Prompt {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  versions: PromptVersion[];
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
}

export class PromptStack {
  private dataPath: string;
  private data: { prompts: Prompt[] };

  constructor(dataPath?: string) {
    this.dataPath = dataPath || path.join(process.env.HOME || '.', '.promptstack', 'prompts.json');
    this.data = this.load();
  }

  private load(): { prompts: Prompt[] } {
    try {
      if (fs.existsSync(this.dataPath)) {
        const content = fs.readFileSync(this.dataPath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      // File doesn't exist or is corrupted, start fresh
    }
    return { prompts: [] };
  }

  reload(): void {
    this.data = this.load();
  }

  private save(): void {
    const dir = path.dirname(this.dataPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2));
  }

  // Public save for external calls
  saveData(): void {
    this.save();
  }

  // Create a new prompt
  create(name: string, description: string, category: string, content: string, tags: string[] = []): Prompt {
    const promptId = uuidv4();
    const versionId = uuidv4();
    const now = new Date().toISOString();

    const prompt: Prompt = {
      id: promptId,
      name,
      description,
      category,
      tags,
      versions: [{
        id: versionId,
        promptId,
        version: 1,
        content,
        metadata: {},
        createdAt: now
      }],
      currentVersion: 1,
      createdAt: now,
      updatedAt: now
    };

    this.data.prompts.push(prompt);
    this.save();
    return prompt;
  }

  // Add a new version to an existing prompt
  addVersion(promptId: string, content: string, metadata?: PromptVersion['metadata']): PromptVersion | null {
    const prompt = this.data.prompts.find(p => p.id === promptId);
    if (!prompt) return null;

    const newVersion = prompt.versions.length + 1;
    const versionId = uuidv4();
    const now = new Date().toISOString();

    const version: PromptVersion = {
      id: versionId,
      promptId,
      version: newVersion,
      content,
      metadata: metadata || {},
      createdAt: now
    };

    prompt.versions.push(version);
    prompt.currentVersion = newVersion;
    prompt.updatedAt = now;
    this.save();

    return version;
  }

  // Get all prompts
  getAll(): Prompt[] {
    return this.data.prompts;
  }

  // Get prompt by ID
  get(promptId: string): Prompt | null {
    return this.data.prompts.find(p => p.id === promptId) || null;
  }

  // Get specific version
  getVersion(promptId: string, version: number): PromptVersion | null {
    const prompt = this.get(promptId);
    if (!prompt) return null;
    return prompt.versions.find(v => v.version === version) || null;
  }

  // Get current version
  getCurrent(promptId: string): PromptVersion | null {
    const prompt = this.get(promptId);
    if (!prompt) return null;
    return prompt.versions[prompt.versions.length - 1] || null;
  }

  // Rate a version
  rateVersion(promptId: string, version: number, rating: number): boolean {
    const versionData = this.getVersion(promptId, version);
    if (!versionData) return false;
    if (rating < 1 || rating > 5) return false;

    versionData.performance = versionData.performance || {};
    versionData.performance.rating = rating;
    this.save();
    return true;
  }

  // Compare two versions
  compare(promptId: string, version1: number, version2: number): { v1: PromptVersion; v2: PromptVersion } | null {
    const v1 = this.getVersion(promptId, version1);
    const v2 = this.getVersion(promptId, version2);
    if (!v1 || !v2) return null;
    return { v1, v2 };
  }

  // Delete prompt
  delete(promptId: string): boolean {
    const index = this.data.prompts.findIndex(p => p.id === promptId);
    if (index === -1) return false;
    this.data.prompts.splice(index, 1);
    this.save();
    return true;
  }

  // Search prompts
  search(query: string): Prompt[] {
    const lower = query.toLowerCase();
    return this.data.prompts.filter(p => 
      p.name.toLowerCase().includes(lower) ||
      p.description.toLowerCase().includes(lower) ||
      p.category.toLowerCase().includes(lower) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(lower))) ||
      p.versions.some(v => v.content.toLowerCase().includes(lower))
    );
  }

  // Get stats
  stats(): { totalPrompts: number; totalVersions: number; categories: Record<string, number> } {
    const categories: Record<string, number> = {};
    let totalVersions = 0;

    for (const prompt of this.data.prompts) {
      categories[prompt.category] = (categories[prompt.category] || 0) + 1;
      totalVersions += prompt.versions.length;
    }

    return {
      totalPrompts: this.data.prompts.length,
      totalVersions,
      categories
    };
  }
}
