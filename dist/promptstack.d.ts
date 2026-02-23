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
        rating?: number;
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
export declare class PromptStack {
    private dataPath;
    private data;
    constructor(dataPath?: string);
    private load;
    reload(): void;
    private save;
    saveData(): void;
    create(name: string, description: string, category: string, content: string, tags?: string[]): Prompt;
    addVersion(promptId: string, content: string, metadata?: PromptVersion['metadata']): PromptVersion | null;
    getAll(): Prompt[];
    get(promptId: string): Prompt | null;
    getVersion(promptId: string, version: number): PromptVersion | null;
    getCurrent(promptId: string): PromptVersion | null;
    rateVersion(promptId: string, version: number, rating: number): boolean;
    compare(promptId: string, version1: number, version2: number): {
        v1: PromptVersion;
        v2: PromptVersion;
    } | null;
    delete(promptId: string): boolean;
    search(query: string): Prompt[];
    stats(): {
        totalPrompts: number;
        totalVersions: number;
        categories: Record<string, number>;
    };
}
