# KasPump Claude Code Skills

This directory contains skills that enhance Claude Code's capabilities when working with the KasPump project.

## What are Skills?

Skills are specialized instruction sets that help Claude Code perform specific tasks more effectively. They provide domain knowledge, best practices, and step-by-step guidance for complex operations.

## Installation

### For Claude Code Desktop/CLI

The skills in this directory are automatically available when using Claude Code in this project.

### For Additional Skills from Anthropic

You can install additional skills from the official Anthropic skills repository:

```bash
# Register the skills marketplace
/plugin marketplace add anthropics/skills

# Install document skills (PDF, DOCX, XLSX, PPTX)
/plugin install document-skills@anthropic-agent-skills

# Install example skills (webapp-testing, artifacts-builder, etc.)
/plugin install example-skills@anthropic-agent-skills
```

## Available Skills

### KasPump-Specific Skills

#### 1. smart-contract-deployment
**Purpose**: Deploy and verify smart contracts on multiple blockchain networks

**When to use**:
- Deploying contracts to BSC, Arbitrum, or Base
- Verifying deployed contracts
- Troubleshooting deployment issues

**Example**:
```
Use the smart-contract-deployment skill to deploy the factory contract to BSC testnet
```

#### 2. web3-testing
**Purpose**: Test Web3 components, smart contract interactions, and wallet integrations

**When to use**:
- Writing tests for React components with Web3 functionality
- Testing wallet connections (RainbowKit, wagmi)
- Testing blockchain transactions
- Writing Hardhat contract tests

**Example**:
```
Use the web3-testing skill to help me write tests for the token creation flow
```

#### 3. kaspump-token-launch
**Purpose**: Guide token launches on the KasPump platform

**When to use**:
- Creating new tokens
- Configuring bonding curve economics
- Planning launch strategies
- Understanding DEX graduation
- Troubleshooting trading issues

**Example**:
```
Use the kaspump-token-launch skill to help me configure token economics for a new launch
```

### Anthropic Skills (Included)

#### 4. webapp-testing
**Purpose**: Playwright-based UI testing for web applications

**When to use**:
- Writing E2E tests
- Testing user flows
- Browser automation

**Example**:
```
Use the webapp-testing skill to create E2E tests for the trading interface
```

#### 5. artifacts-builder
**Purpose**: Build React/Tailwind components and HTML artifacts

**When to use**:
- Creating new UI components
- Prototyping interfaces
- Building interactive previews

**Example**:
```
Use the artifacts-builder skill to create a new chart component
```

#### 6. skill-creator
**Purpose**: Create new custom skills

**When to use**:
- Building project-specific skills
- Extending Claude Code capabilities

**Example**:
```
Use the skill-creator skill to help me create a new monitoring skill
```

## How to Use Skills

### Method 1: Explicit Invocation

Directly ask Claude to use a specific skill:

```
Use the smart-contract-deployment skill to deploy to BSC testnet
```

### Method 2: Natural Language

Claude will automatically load relevant skills based on your request:

```
I need to deploy the factory contract to Arbitrum
(Claude will automatically use the smart-contract-deployment skill)
```

### Method 3: Task-Based

Describe what you want to accomplish:

```
Help me test the wallet connection in my component
(Claude will use the web3-testing skill)
```

## Skill Structure

Each skill follows this structure:

```
skill-name/
├── SKILL.md          # Main skill file with YAML frontmatter and instructions
├── examples/         # Optional example files
├── scripts/          # Optional helper scripts
└── LICENSE.txt       # Optional license file
```

### SKILL.md Format

```markdown
---
name: skill-name
description: What the skill does and when to use it
allowed-tools:
  - Bash
  - Read
  - Edit
---

# Skill instructions in Markdown...
```

## Creating Custom Skills

To create a new skill for this project:

1. Create a directory: `.claude/skills/my-new-skill/`
2. Create `SKILL.md` with frontmatter and instructions
3. Test the skill by invoking it in Claude Code
4. Document it in this README

You can use the `skill-creator` skill to help:

```
Use the skill-creator skill to help me create a new skill for monitoring KasPump deployments
```

## Best Practices

1. **Be Specific**: Use exact skill names when you want a particular approach
2. **Trust Auto-Selection**: Claude often picks the right skill automatically
3. **Combine Skills**: You can use multiple skills in a single session
4. **Update Skills**: Keep skills current as the project evolves
5. **Test First**: Try skills on non-critical tasks first

## Troubleshooting

### Skill Not Loading

- Check that `SKILL.md` exists in the skill directory
- Verify YAML frontmatter is valid
- Ensure skill name matches directory name

### Wrong Skill Selected

- Explicitly request the skill you want
- Improve skill descriptions to be more specific
- Check if skill descriptions overlap

### Skill Not Working as Expected

- Review the skill's instructions in `SKILL.md`
- Update the skill with better guidance
- Add examples to clarify usage

## Contributing

When adding new skills:

1. Follow the [Agent Skills Spec](../../../tmp/anthropic-skills/agent_skills_spec.md)
2. Use descriptive names and clear descriptions
3. Include practical examples in the skill
4. Test thoroughly before committing
5. Update this README

## Resources

- [Anthropic Skills Repository](https://github.com/anthropics/skills)
- [Agent Skills Spec](../../../tmp/anthropic-skills/agent_skills_spec.md)
- [Claude Code Documentation](https://docs.claude.com/claude-code)

## License

KasPump-specific skills are licensed under the same license as the main project.

Anthropic skills retain their original licenses (see individual LICENSE.txt files).
