# Problem and Scope
When self-studying, it is hard to know what you can learn next. SynapseWeaver shows you related topics to guide and help you expand your knowledge.

# MVP and v2
## v1 (MVP)
- Starting nodes
- Related nodes generation
- Nodes graph visualization
- Export nodes content
- Edit nodes

## v2
- Generate node text with AI
- Export/Import partial/entire graph
- Create multiple graphs
- Merge similar nodes
- Throw info into knowledge bin, automatically gets placed in graph

# Data
Node
- Id
- Title
- Summary
- Created At
- Embedding
- Contents
- Edges From
- Edges To

Edge
- Id
- Source Node Id
- Target Node Id
- Weight
- Generation Source
- Created At

Content
- Id
- Node
- Type
- Text
- Url
- File Url
- Created At
- Generated Nodes

# Architecture
Backend: PostgreSQL, Next
Frontend: Next, React
Interface: Web-app

# Milestones

## M1
Default graph. Graph visualization and navigation. Edit nodes (Add/edit text, urls, files)

## M2
Starting nodes. Generate related nodes.

## M3
Export nodes content. Export/Import graph. Create multiple graphs.

## M4
Knowledge bin. Generate node text content with AI

## M5
Auto merge similar nodes to avoid duplicates during generation

# Other Tools
This app uses Gemini's API for key functionalities.
