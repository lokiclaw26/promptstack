import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
export class PromptStack {
    dataPath;
    data;
    constructor(dataPath) {
        this.dataPath = dataPath || path.join(process.env.HOME || '.', '.promptstack', 'prompts.json');
        this.data = this.load();
    }
    load() {
        try {
            if (fs.existsSync(this.dataPath)) {
                const content = fs.readFileSync(this.dataPath, 'utf-8');
                return JSON.parse(content);
            }
        }
        catch (error) {
            // File doesn't exist or is corrupted, start fresh
        }
        return { prompts: [] };
    }
    save() {
        const dir = path.dirname(this.dataPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2));
    }
    // Create a new prompt
    create(name, description, category, content) {
        const promptId = uuidv4();
        const versionId = uuidv4();
        const now = new Date().toISOString();
        const prompt = {
            id: promptId,
            name,
            description,
            category,
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
    addVersion(promptId, content, metadata) {
        const prompt = this.data.prompts.find(p => p.id === promptId);
        if (!prompt)
            return null;
        const newVersion = prompt.versions.length + 1;
        const versionId = uuidv4();
        const now = new Date().toISOString();
        const version = {
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
    getAll() {
        return this.data.prompts;
    }
    // Get prompt by ID
    get(promptId) {
        return this.data.prompts.find(p => p.id === promptId) || null;
    }
    // Get specific version
    getVersion(promptId, version) {
        const prompt = this.get(promptId);
        if (!prompt)
            return null;
        return prompt.versions.find(v => v.version === version) || null;
    }
    // Get current version
    getCurrent(promptId) {
        const prompt = this.get(promptId);
        if (!prompt)
            return null;
        return prompt.versions[prompt.versions.length - 1] || null;
    }
    // Rate a version
    rateVersion(promptId, version, rating) {
        const versionData = this.getVersion(promptId, version);
        if (!versionData)
            return false;
        if (rating < 1 || rating > 5)
            return false;
        versionData.performance = versionData.performance || {};
        versionData.performance.rating = rating;
        this.save();
        return true;
    }
    // Compare two versions
    compare(promptId, version1, version2) {
        const v1 = this.getVersion(promptId, version1);
        const v2 = this.getVersion(promptId, version2);
        if (!v1 || !v2)
            return null;
        return { v1, v2 };
    }
    // Delete prompt
    delete(promptId) {
        const index = this.data.prompts.findIndex(p => p.id === promptId);
        if (index === -1)
            return false;
        this.data.prompts.splice(index, 1);
        this.save();
        return true;
    }
    // Search prompts
    search(query) {
        const lower = query.toLowerCase();
        return this.data.prompts.filter(p => p.name.toLowerCase().includes(lower) ||
            p.description.toLowerCase().includes(lower) ||
            p.category.toLowerCase().includes(lower) ||
            p.versions.some(v => v.content.toLowerCase().includes(lower)));
    }
    // Get stats
    stats() {
        const categories = {};
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
