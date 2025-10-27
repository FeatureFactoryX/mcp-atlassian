# MCP Atlassian

A Model Context Protocol (MCP) server that provides comprehensive tools for interacting with Atlassian products (Confluence and Jira).

## Overview

This MCP server allows AI agents to interact with Atlassian products through a standardized interface. It provides extensive tools for:

- **Confluence**: Full CRUD operations, content search, space management, page management, comments, labels, and more using v2 REST API
- **Jira**: Issue management, project operations, transitions, comments, and comprehensive workflow support

## Key Features

- **Modern API Support**: Uses Confluence v2 REST API with fallback to v1 for search functionality, and Jira API v3 with enhanced search endpoints
- **Comprehensive Toolset**: 18+ Confluence tools and 8+ Jira tools covering all major operations
- **Token Optimization**: Custom field filtering for Jira queries reduces token consumption by 90%+
- **Security & Privacy**: Built-in PII filtering and SSL verification controls
- **Flexible Configuration**: Support for separate service URLs, authentication methods, and tool filtering
- **Pagination Support**: Cursor-based pagination for Confluence v2 APIs, token-based pagination for Jira v3 enhanced search API
- **Error Handling**: Comprehensive error handling with detailed error messages
- **Type Safety**: Full TypeScript implementation with proper type definitions

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Atlassian account with API token
- Docker (optional, for containerized deployment)

## Installation

### Standard Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/mcp-atlassian.git
   cd mcp-atlassian
   ```

2. Install dependencies:

   ```bash
   npm install
   # or using make
   make install
   ```

3. Create a `.env` file in the root directory with your Atlassian credentials:
   ```
   ATLASSIAN_HOST=https://your-domain.atlassian.net
   ATLASSIAN_EMAIL=your-email@example.com
   ATLASSIAN_API_TOKEN=your-api-token
   ```

### Docker Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/mcp-atlassian.git
   cd mcp-atlassian
   ```

2. Create a `.env` file as described above.

3. Build and run the Docker container:

   ```bash
   # Build the Docker image
   make docker-build

   # Run the Docker container
   make docker-run

   # Or use Docker Compose
   make docker-compose
   ```

## Usage

### Starting the Server

```bash
# Using npm
npm start

# Using make
make start

# Using Docker
make docker-run
```

This will start the MCP server, which will listen and respond on streamable HTTP.

### MCP configuration

The server runs on port 3005 by default (configurable via `PORT` environment variable in `.env`).

#### Claude Code/Desktop Configuration

Add to your Claude configuration file:

```json
{
  "mcpServers": {
    "atlassian": {
      "type": "streamable-http",
      "streamable": true,
      "url": "http://localhost:3005/mcp"
    }
  }
}
```

**Note**: The port defaults to 3000 if `PORT` is not set in your `.env` file. Adjust the URL accordingly.

### Available Tools

#### Confluence Tools

**Search & Discovery:**

- **search_confluence**: Search for content in Confluence using v1 API with CQL
  - Parameters: `searchText` (string), `spaceKey` (string, optional), `limit` (number), `start` (number)

- **search_confluence_pages_by_title**: Search pages by title using v2 API
  - Parameters: `title` (string, optional), `spaceId` (string, optional), `limit` (number), `cursor` (string, optional)

**Space Management:**

- **get_confluence_space_by_id_or_key**: Get information about a specific Confluence space
  - Parameters: `spaceIdOrKey` (string)

- **get_confluence_spaces**: Get all available spaces
  - Parameters: `limit` (number, optional), `cursor` (string, optional)

**Page Management:**

- **get_confluence_content**: Get specific page content by ID
  - Parameters: `pageId` (string), `bodyFormat` (enum: storage/atlas_doc_format/wiki, optional)

- **get_confluence_pages**: Get all pages in a space
  - Parameters: `spaceId` (string), `limit` (number, optional), `cursor` (string, optional)

- **get_confluence_child_pages**: Get child pages of a specific page
  - Parameters: `pageId` (string), `limit` (number, optional), `cursor` (string, optional)

- **confluence_create_page**: Create a new Confluence page
  - Parameters: `spaceId` (string), `title` (string), `content` (string), `status` (enum, optional), `representation` (enum, optional), `parentId` (string, optional)

- **confluence_update_page**: Update an existing page
  - Parameters: `pageId` (string), `title` (string), `content` (string), `version` (number), `status` (enum, optional), `representation` (enum, optional), `versionMessage` (string, optional)

- **update_confluence_page_title**: Update only the title of a page
  - Parameters: `pageId` (string), `title` (string), `status` (enum, optional)

- **confluence_delete_page**: Delete a Confluence page
  - Parameters: `pageId` (string)

**Label Management:**

- **get_confluence_pages_by_label**: Find pages with specific labels
  - Parameters: `label` (string), `spaceId` (string, optional), `limit` (number, optional), `cursor` (string, optional)

- **get_confluence_page_labels**: Get labels for a specific page
  - Parameters: `pageId` (string), `limit` (number, optional), `cursor` (string, optional)

- **add_confluence_page_labels**: Add labels to a page
  - Parameters: `pageId` (string), `labels` (array of strings)

**Comments:**

- **get_confluence_page_comments**: Get regular comments on a page
  - Parameters: `pageId` (string), `limit` (number, optional), `cursor` (string, optional)

- **add_confluence_page_comment**: Add a comment to a page
  - Parameters: `pageId` (string), `content` (string), `representation` (enum, optional)

- **get_confluence_page_inline_comments**: Get inline comments on a page
  - Parameters: `pageId` (string), `limit` (number, optional), `cursor` (string, optional)

- **create_confluence_footer_comment**: Create a footer comment
  - Parameters: `pageId` (string, optional), `blogPostId` (string, optional), `parentCommentId` (string, optional), `attachmentId` (string, optional), `customContentId` (string, optional), `content` (string), `representation` (enum, optional)

#### Jira Tools

- **search_jira_issues**: Search for issues using JQL (Jira Query Language)
  - Parameters: `jql` (string), `maxResults` (number, optional)

- **get_jira_issue**: Get detailed information about a specific issue
  - Parameters: `issueKey` (string)

- **jira_get_all_projects**: Get all accessible projects
  - Parameters: none

- **jira_create_issue**: Create a new Jira issue
  - Parameters: `projectKey` (string), `issueType` (string), `summary` (string), `description` (string, optional), additional fields

- **jira_update_issue**: Update an existing issue
  - Parameters: `issueKey` (string), `fields` (object with update data)

- **jira_add_comment**: Add a comment to an issue
  - Parameters: `issueKey` (string), `comment` (string)

- **jira_get_transitions**: Get available transitions for an issue
  - Parameters: `issueKey` (string)

- **jira_transition_issue**: Transition an issue to a different status
  - Parameters: `issueKey` (string), `transitionId` (string), `comment` (string, optional)

### Custom Token-Optimized Jira Tools

These custom tools use field filtering to dramatically reduce token consumption (90%+ reduction):

- **calculate_story_points**: Calculate story points completed per project from a date to now
  - Parameters: `projects` (array of strings, required), `startDate` (string, optional, defaults to 14 days ago)
  - Fields fetched: Only `project` and `customfield_10016` (story points) - 2 fields instead of 50+
  - Token savings: ~93% reduction (800 tokens vs 12,000 tokens for 150 issues)
  - Example: `{ projects: ["PROJ1", "PROJ2", "PROJ3"] }` or `{ projects: ["PROJ1"], startDate: "2025-09-12 09:00" }`
  - Returns: Markdown table grouped by project with ticket counts and story point totals

- **deployment_report**: Show tickets that changed status within a date range for a specified project
  - Parameters: `project` (string, required), `startDate` (string, optional, DD-MM format), `endDate` (string, optional, DD-MM format)
  - Fields fetched: Only `summary`, `status`, `issuetype`, `updated`, `assignee`, `priority` - 6 fields instead of 50+
  - Token savings: ~92% reduction (600 tokens vs 8,000 tokens for 50 issues)
  - Smart year-wrapping: Handles date ranges that cross year boundaries (e.g., Dec to Jan)
  - Example: `{ project: "PROJ1" }` (defaults to last 7 days) or `{ project: "PROJ1", startDate: "10-10", endDate: "15-10" }`
  - Returns: Markdown output grouped by current status

**Token Optimization Approach:**
- Standard Jira API responses include 50+ fields per issue, consuming ~200 tokens per issue
- By requesting only necessary fields (2-6 fields), each issue consumes ~5-15 tokens
- For common queries (100-150 issues), this reduces token usage from 10,000-20,000 to 500-1,500 tokens
- The `search_jira_issues` tool also supports optional `fields` parameter for custom optimization

## Architecture Notes

### Confluence API Migration

This server primarily uses the **Confluence v2 REST API** for most operations, with strategic fallback to v1 API where necessary:

- **v2 API**: Used for spaces, pages, comments, labels - provides better performance and modern cursor-based pagination
- **v1 API**: Used for content search via CQL - provides more powerful search capabilities
- **SSL Support**: Configurable SSL verification bypass for self-hosted instances
- **Authentication**: Supports basic auth, OAuth 2.0 (planned), and PAT tokens

### Tool Filtering & Security

- **Read-Only Mode**: Disable all write operations for safe exploration
- **Tool Whitelist**: Enable only specific tools via `ENABLED_TOOLS` environment variable
- **PII Filtering**: Automatic detection and masking of sensitive information in responses
- **Error Context**: Detailed error messages without exposing sensitive configuration

## Recent Migrations

### Jira Client Library (October 2025)

Migrated from `ts-jira-client` to `jira.js` (v5.2.2) for better API v3 support and active maintenance.

**Key changes**:
- Full TypeScript support with comprehensive type definitions
- Native Jira API v3 support via `Version3Client`
- Better error handling and authentication
- No configuration changes required

### Enhanced Search API (October 2025)

Migrated from deprecated `/rest/api/3/search` endpoint to `/rest/api/3/search/jql` following [Atlassian CHANGE-2046](https://developer.atlassian.com/changelog/#CHANGE-2046).

**Key changes**:
- Token-based pagination using `nextPageToken` instead of offset-based `startAt`
- Response includes `isLast` flag instead of `total` count
- Better read-after-write consistency
- All existing JQL queries continue to work unchanged

See [CUSTOMIZATIONS.md](CUSTOMIZATIONS.md) for detailed migration information and implementation details.

## Development

### Project Structure

```
src/
├── config/         # Configuration files
│   └── env.ts      # Environment configuration with validation
├── services/       # Service classes for Atlassian APIs
│   ├── confluencev2.ts    # Confluence v2 REST API service (primary)
│   ├── confluence.ts      # Legacy Confluence service (deprecated)
│   └── jira.ts           # Jira REST API service
├── tools/          # MCP tool implementations
│   ├── search-confluence.ts                    # Content search (v1 API)
│   ├── search-confluence-pages-by-title.ts     # Title search (v2 API)
│   ├── get-confluence-space.ts                 # Single space info
│   ├── get-confluence-spaces.ts                # All spaces list
│   ├── get-confluence-content.ts               # Page content by ID
│   ├── get-confluence-pages.ts                 # Pages in space
│   ├── get-confluence-child-pages.ts           # Child pages
│   ├── get-confluence-pages-by-label.ts        # Pages by label
│   ├── get-confluence-page-labels.ts           # Page labels
│   ├── add-confluence-page-labels.ts           # Add labels
│   ├── get-confluence-page-comments.ts         # Page comments
│   ├── add-confluence-page-comment.ts          # Add comment
│   ├── get-confluence-page-inline-comments.ts  # Inline comments
│   ├── confluence-create-page.ts               # Create page
│   ├── confluence-update-page.ts               # Update page
│   ├── update-confluence-page-title.ts         # Update title only
│   ├── confluence-delete-page.ts               # Delete page
│   ├── create-confluence-footer-comment.ts     # Footer comments
│   ├── search-jira-issues.ts                   # Jira search
│   ├── get-jira-issue.ts                       # Single issue
│   ├── jira-create-issue.ts                    # Create issue
│   ├── jira-update-issue.ts                    # Update issue
│   ├── jira-add-comment.ts                     # Add comment
│   ├── jira-get-transitions.ts                 # Get transitions
│   ├── jira-transition-issue.ts                # Transition issue
│   ├── jira-get-all-projects.ts                # All projects
│   ├── utils.ts                                 # Utility functions & PII filtering
│   └── index.ts                                # Tool exports
├── utils/          # Utility modules
│   └── tool-filter.ts      # Tool filtering and access control
└── index.ts        # Main entry point and server setup
```

### Building

```bash
# Using npm
npm run build

# Using make
make build
```

### Testing

```bash
# Using npm
npm test

# Using make
make test
```

### Makefile Commands

The project includes a Makefile to simplify common operations:

```bash
# Display available commands
make help
```

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
