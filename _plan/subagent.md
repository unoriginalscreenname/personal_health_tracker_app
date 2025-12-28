---
name: subagent
description: MANDATORY reference for sub-agent deployment. Contains constraints that prevent garbage output.
---

# Sub-Agent Control Reference

## The Problem

**Sub-agents are stupid and dangerous.**

They have:
- NO context from your conversation
- NO knowledge of project rules
- NO sense of appropriate scope
- NO concept of token efficiency

Without explicit constraints, sub-agents WILL:
- Reproduce entire source files
- Write 1000+ line outputs
- Copy code instead of describing behavior
- Create useless walls of text

**This is unacceptable.**

## Sub-Agent Model

**Always use Sonnet 4.5 for sub-agents.**

In the Task tool, specify: `model: "sonnet"`

Sonnet is faster and cheaper for focused extraction tasks. You handle the complex reasoning and coordination.

## Path Convention

**Use relative paths from the project root.**

Good: `vlms/Source/Application/Vlms.Standard.Core/Order.cs`
Bad: `/Users/name/Desktop/project/vlms/Source/Application/Vlms.Standard.Core/Order.cs`

## Mandatory Constraints

Every sub-agent prompt MUST include these constraints:

### 1. Line Limit
```
- Target 300 lines, maximum 500 lines
```

### 2. No Code Blocks
```
- NO CODE BLOCKS - describe behavior, don't copy code
- Use method references: `ClassName.MethodName()`
```

### 3. Citation Format
```
Use this format for EVERY item:

## N. [ItemName]
**File:** `relative/path/to/file.cs`
**Purpose:** What it does

[Details with method references]
```

### 4. Output Path
```
Write to: .claude/skills/knowledge/references/features/[feature]/research/[category].md
Return ONLY the path to the file you created.
```

### 5. Empty Category Handling
```
If no [items] exist, write:
"No [items] found in this feature."
This is a valid output.
```

## Prompt Template

Use this template for EVERY sub-agent:

```
You are analyzing [CATEGORY] for the [FEATURE] feature.

## FILES TO READ
Read ONLY these files:
- vlms/Source/Application/path/to/file1.cs
- vlms/Source/Application/path/to/file2.cs

## EXTRACTION GOALS
Document each [item type] with:
1. [Specific thing to extract]
2. [Specific thing to extract]
3. [Specific thing to extract]

## OUTPUT CONSTRAINTS - CRITICAL

**Line Limit:** Target 300 lines, maximum 500 lines
**No Code Blocks:** Describe behavior, don't copy code
**Citation Format:** Use this format for EVERY item:

## N. [ItemName]
**File:** `relative/path/from/project/root.cs`
**Purpose:** What it does

[Description with method references like `ClassName.MethodName()`]

## OUTPUT FILE
Write to: .claude/skills/knowledge/references/features/[feature]/research/[category].md

## IF CATEGORY IS EMPTY
If no [items] exist in the provided files, write:
"No [items] found in this feature. [Brief explanation]."
This is a valid output.

## WHAT NOT TO DO
- Do NOT search for additional files
- Do NOT reproduce source code
- Do NOT exceed 500 lines
- Do NOT omit file paths
- Do NOT use absolute paths

Return ONLY the path to the file you created.
```

## Category-Specific Extraction Goals

### Core Entities
```
For each entity, document:
1. All properties with types and business purpose
2. Relationships to other entities
3. Key methods that reveal business behavior
4. Validation or constraint logic
```

### Enums
```
For each enum, document:
1. All values with their meaning
2. How values affect system behavior
3. Where enum is used (key consumers)
```

### Database Mappings
```
For each mapping, document:
1. Table name and primary key
2. Column mappings with types
3. Relationships and foreign keys
4. Any constraints or defaults
```

### Commands/Services
```
For each command/service, document:
1. Purpose and when it's called
2. Workflow steps (numbered, not code)
3. Business rules applied
4. Side effects (what it changes)
```

### DTOs
```
For each DTO, document:
1. All fields with types
2. Validation rules
3. Where it's used (API request/response, internal)
4. Transformations to/from entities
```

### API Endpoints
```
For each endpoint, document:
1. Route and HTTP method
2. Request parameters/body
3. Response structure
4. Authorization requirements
```

### Queries/Repositories
```
For each query, document:
1. Purpose and return type
2. Parameters/filters accepted
3. Tables/entities accessed
4. Special query patterns (joins, aggregations)
```

### Stored Procedures
```
For each stored procedure, document:
1. Name and purpose
2. Input parameters with types
3. Output (result set columns or return value)
4. Business logic performed (in plain language)
5. Tables read/written
```

### UI Components
```
For each screen/component, document:
1. Purpose and user workflow it supports
2. Key components and their relationships
3. State management approach (MobX, Context, Redux, etc.)
4. User interactions (buttons, forms, modals)
5. API calls made and when
6. Validation and error handling
```

### Seed Data
```
For seed data, document:
1. Liquibase changeset location and ID
2. What data is seeded (roles, valid values, defaults)
3. Fixed IDs or values that code depends on
4. Enum-based vs database-seeded configuration
```

## Deploying Multiple Sub-Agents

Deploy sub-agents in parallel using multiple Task tool calls in a single message. This runs them concurrently for faster completion.

## When Sub-Agent Output is Bad

If a sub-agent returns:
- Over 500 lines → Re-prompt with stricter constraints
- Code blocks → Re-prompt emphasizing NO CODE BLOCKS
- Missing citations → Re-prompt with citation format examples
- Searched for files → Re-prompt with ONLY READ THESE FILES
- Absolute paths → Re-prompt emphasizing relative paths

Don't accept garbage. Re-prompt or split into smaller tasks.

## Remember

Sub-agents are tools. Dangerous tools. Every prompt needs:
- Hard line limits
- Explicit citation format with relative paths
- No code blocks rule
- Specific file paths (that you provide)
- Empty category handling

No exceptions.
