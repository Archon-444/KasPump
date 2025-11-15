# Claude Code Skills Integration Guide

This project now includes integrated skills for Claude Code to enhance development productivity and domain expertise.

## Quick Start

When using Claude Code with this project, you can now leverage specialized skills:

```
Use the smart-contract-deployment skill to deploy to BSC testnet
```

```
Use the web3-testing skill to help write tests for the trading component
```

```
Use the kaspump-token-launch skill to configure bonding curve parameters
```

## What Changed?

A `.claude/skills/` directory has been added with:

1. **3 KasPump-specific skills**:
   - `smart-contract-deployment` - For deploying and verifying contracts
   - `web3-testing` - For testing Web3 functionality
   - `kaspump-token-launch` - For token launch guidance

2. **3 Anthropic skills**:
   - `webapp-testing` - For Playwright E2E testing
   - `artifacts-builder` - For building React components
   - `skill-creator` - For creating new skills

## Benefits

### For Smart Contract Development
- Streamlined deployment process across networks
- Best practices for contract verification
- Troubleshooting guidance for common issues

### For Web3 Testing
- Patterns for mocking wallet connections
- Testing strategies for blockchain transactions
- Hardhat testing templates

### For Token Launches
- Economic parameter guidance
- Launch strategy best practices
- Post-launch monitoring tips

### For Frontend Development
- E2E testing with Playwright
- Component building with React/Tailwind
- Automated testing patterns

## How to Use

### Automatic Skill Selection

Claude Code will automatically select relevant skills based on your request:

```
"Deploy the factory contract to Arbitrum"
→ Uses smart-contract-deployment skill
```

```
"Write tests for the wallet connection"
→ Uses web3-testing skill
```

### Explicit Skill Invocation

Request a specific skill directly:

```
Use the kaspump-token-launch skill to help me plan a token launch strategy
```

### Multi-Skill Workflows

Combine multiple skills in a session:

```
First use the smart-contract-deployment skill to deploy to testnet,
then use the web3-testing skill to write integration tests
```

## Available Skills Reference

| Skill Name | Purpose | When to Use |
|------------|---------|-------------|
| `smart-contract-deployment` | Deploy & verify contracts | Deploying to BSC/Arbitrum/Base |
| `web3-testing` | Test Web3 components | Writing tests for wallets/transactions |
| `kaspump-token-launch` | Token launch guidance | Creating tokens, configuring economics |
| `webapp-testing` | Playwright E2E tests | Testing user flows |
| `artifacts-builder` | Build React components | Creating UI components |
| `skill-creator` | Create custom skills | Extending Claude Code |

## Installation (Optional)

The skills in `.claude/skills/` are automatically available. To add more skills from Anthropic:

### Via Claude Code CLI

```bash
# Register the marketplace
/plugin marketplace add anthropics/skills

# Install document skills
/plugin install document-skills@anthropic-agent-skills

# Install additional example skills
/plugin install example-skills@anthropic-agent-skills
```

### Manual Installation

Clone skills from the [Anthropic skills repository](https://github.com/anthropics/skills):

```bash
cd .claude/skills
git clone https://github.com/anthropics/skills temp
cp -r temp/algorithmic-art ./
cp -r temp/canvas-design ./
# ... copy other desired skills
rm -rf temp
```

## Creating Custom Skills

To create a project-specific skill:

1. Create a directory: `.claude/skills/my-skill/`
2. Create `SKILL.md`:

```markdown
---
name: my-skill
description: What the skill does and when to use it
allowed-tools:
  - Bash
  - Read
  - Edit
---

# Instructions for the skill

Provide detailed guidance, examples, and best practices...
```

3. Use the skill:

```
Use the my-skill to help with...
```

Or leverage the `skill-creator` skill:

```
Use the skill-creator skill to help me create a new monitoring skill
```

## Examples

### Example 1: Deploy Contract

```
User: Deploy the KasPumpFactory to BSC testnet

Claude: I'll use the smart-contract-deployment skill to deploy to BSC testnet.

First, let me verify the configuration...
[Claude follows the skill's deployment process]
```

### Example 2: Write Tests

```
User: Help me write tests for the token creation flow

Claude: I'll use the web3-testing skill to help write comprehensive tests.

Based on the skill's patterns, here's a test suite...
[Claude provides testing code following skill guidelines]
```

### Example 3: Launch Strategy

```
User: I want to launch a community token with a fair bonding curve

Claude: I'll use the kaspump-token-launch skill to help you plan this.

For a fair launch, consider these economic parameters...
[Claude provides launch guidance from the skill]
```

## Best Practices

1. **Be Specific**: Use exact skill names for deterministic behavior
2. **Trust Auto-Selection**: Claude usually picks the right skill
3. **Iterate**: Refine skills as you learn what works
4. **Document**: Keep skill instructions up-to-date
5. **Test**: Try skills on non-critical tasks first

## Troubleshooting

### Skill Not Being Used

- Explicitly request it: "Use the X skill to..."
- Check skill description is clear and relevant
- Verify `SKILL.md` exists and is valid

### Unexpected Behavior

- Review the skill's instructions in `.claude/skills/[skill-name]/SKILL.md`
- Update the skill with corrections
- Create an issue for discussion

### Want a New Skill

- Use `skill-creator` to generate a template
- Add to `.claude/skills/[new-skill-name]/SKILL.md`
- Test and iterate
- Share successful skills with the team

## Resources

- [Skill README](.claude/skills/README.md) - Detailed skill documentation
- [Anthropic Skills Repository](https://github.com/anthropics/skills) - Official skills
- [Claude Code Docs](https://docs.claude.com/claude-code) - Claude Code documentation
- [Agent Skills Spec](https://github.com/anthropics/skills/blob/main/agent_skills_spec.md) - Skill format specification

## Contributing

When adding new skills:

1. Create in `.claude/skills/[skill-name]/`
2. Follow the Agent Skills Spec format
3. Test thoroughly
4. Update `.claude/skills/README.md`
5. Update this guide if needed
6. Commit with clear description

## Maintenance

Skills should be updated when:

- Project structure changes
- New features are added
- Best practices evolve
- Issues are discovered

Keep skills aligned with the actual codebase and workflows.

## License

KasPump-specific skills are licensed under the project license.

Anthropic skills retain their original licenses (see individual LICENSE.txt files in skill directories).

---

**Last Updated**: 2025-11-15

**Maintained By**: KasPump Development Team
