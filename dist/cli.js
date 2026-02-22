#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { PromptStack } from './promptstack.js';
import * as diff from 'diff';
const program = new Command();
const ps = new PromptStack();
program
    .name('promptstack')
    .description('Prompt version control for AI power users')
    .version('1.0.0');
// Create a new prompt
program.command('create <name>')
    .description('Create a new prompt')
    .option('-d, --description <desc>', 'Prompt description')
    .option('-c, --category <category>', 'Category (e.g., coding, writing, analysis)', 'general')
    .option('-t, --content <content>', 'Prompt content')
    .action((name, options) => {
    const prompt = ps.create(name, options.description || '', options.category, options.content || '');
    console.log(chalk.green('✓ Created prompt:'), chalk.bold(name));
    console.log(chalk.gray('  ID:'), prompt.id);
    console.log(chalk.gray('  Version:'), '1');
});
// List all prompts
program.command('list')
    .alias('ls')
    .description('List all prompts')
    .option('-c, --category <category>', 'Filter by category')
    .action((options) => {
    const prompts = ps.getAll();
    if (prompts.length === 0) {
        console.log(chalk.yellow('No prompts found. Create one with `promptstack create <name>`'));
        return;
    }
    console.log(chalk.bold('\n📚 Your Prompts:\n'));
    prompts.forEach(p => {
        if (options.category && p.category !== options.category)
            return;
        console.log(chalk.cyan('•'), chalk.bold(p.name), chalk.gray(`(${p.category})`));
        console.log(chalk.gray('  ID:'), p.id);
        console.log(chalk.gray('  Versions:'), p.versions.length.toString());
        console.log(chalk.gray('  Description:'), p.description || '(none)');
        console.log();
    });
});
// Show a prompt
program.command('show <promptId>')
    .description('Show prompt details')
    .option('-v, --version <num>', 'Specific version to show', parseInt)
    .action((promptId, options) => {
    const prompt = ps.get(promptId);
    if (!prompt) {
        console.log(chalk.red('Prompt not found'));
        return;
    }
    const version = options.version
        ? ps.getVersion(promptId, options.version)
        : ps.getCurrent(promptId);
    if (!version) {
        console.log(chalk.red('Version not found'));
        return;
    }
    console.log(chalk.bold.cyan(`\n📄 ${prompt.name}\n`));
    console.log(chalk.gray('Category:'), prompt.category);
    console.log(chalk.gray('Version:'), `${version.version}/${prompt.versions.length}`);
    console.log(chalk.gray('Created:'), version.createdAt);
    if (version.metadata.notes) {
        console.log(chalk.gray('Notes:'), version.metadata.notes);
    }
    if (version.performance?.rating) {
        console.log(chalk.gray('Rating:'), '⭐'.repeat(version.performance.rating));
    }
    console.log(chalk.gray('\n--- Content ---\n'));
    console.log(version.content);
    console.log();
});
// Add a new version
program.command('version <promptId>')
    .description('Add a new version to a prompt')
    .option('-t, --content <content>', 'Prompt content')
    .option('-n, --notes <notes>', 'Notes about this version')
    .option('-m, --model <model>', 'Model used')
    .action((promptId, options) => {
    const version = ps.addVersion(promptId, options.content || '', {
        notes: options.notes,
        model: options.model
    });
    if (!version) {
        console.log(chalk.red('Prompt not found'));
        return;
    }
    console.log(chalk.green('✓ Added version'), chalk.bold(`v${version.version}`));
});
// Compare versions
program.command('diff <promptId>')
    .description('Compare two versions of a prompt')
    .argument('<v1>', 'First version number', parseInt)
    .argument('<v2>', 'Second version number', parseInt)
    .action((promptId, v1, v2) => {
    const comparison = ps.compare(promptId, v1, v2);
    if (!comparison) {
        console.log(chalk.red('Could not compare versions'));
        return;
    }
    console.log(chalk.bold(`\n🔄 Comparing v${v1} → v${v2}:\n`));
    const changes = diff.diffLines(comparison.v1.content, comparison.v2.content);
    changes.forEach(part => {
        const color = part.added ? chalk.green : part.removed ? chalk.red : chalk.gray;
        const prefix = part.added ? '+ ' : part.removed ? '- ' : '  ';
        console.log(color(prefix + part.value?.trim()));
    });
    console.log();
});
// Rate a version
program.command('rate <promptId>')
    .description('Rate a prompt version (1-5 stars)')
    .argument('<version>', 'Version number', parseInt)
    .argument('<rating>', 'Rating (1-5)', parseInt)
    .action((promptId, version, rating) => {
    if (rating < 1 || rating > 5) {
        console.log(chalk.red('Rating must be between 1 and 5'));
        return;
    }
    const success = ps.rateVersion(promptId, version, rating);
    if (!success) {
        console.log(chalk.red('Failed to rate version'));
        return;
    }
    console.log(chalk.green('✓ Rated v' + version + ':'), '⭐'.repeat(rating));
});
// Search prompts
program.command('search <query>')
    .description('Search prompts')
    .action((query) => {
    const results = ps.search(query);
    if (results.length === 0) {
        console.log(chalk.yellow('No matches found'));
        return;
    }
    console.log(chalk.bold(`\n🔍 Results for "${query}":\n`));
    results.forEach(p => {
        console.log(chalk.cyan('•'), chalk.bold(p.name), chalk.gray(`(${p.category})`));
        console.log(chalk.gray('  ID:'), p.id);
    });
    console.log();
});
// Show stats
program.command('stats')
    .description('Show prompt statistics')
    .action(() => {
    const stats = ps.stats();
    console.log(chalk.bold('\n📊 PromptStack Stats:\n'));
    console.log(chalk.cyan('Total Prompts:'), stats.totalPrompts.toString());
    console.log(chalk.cyan('Total Versions:'), stats.totalVersions.toString());
    console.log(chalk.cyan('Categories:'));
    Object.entries(stats.categories).forEach(([cat, count]) => {
        console.log(chalk.gray(`  • ${cat}:`), count.toString());
    });
    console.log();
});
// Delete a prompt
program.command('delete <promptId>')
    .description('Delete a prompt')
    .action((promptId) => {
    const success = ps.delete(promptId);
    if (!success) {
        console.log(chalk.red('Prompt not found'));
        return;
    }
    console.log(chalk.green('✓ Deleted prompt'));
});
program.parse();
