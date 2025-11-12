# Project Gantt Chart Viewer

A web application that connects to Asana or Airtable to visualize project data as interactive Gantt charts.

## Features

- **Multi-source support**: Connect to both Asana and Airtable
- **Flexible field mapping**: Configure how data fields map to Gantt chart properties
- **Interactive Gantt charts**: Powered by ApexCharts Gantt component
- **Service-oriented architecture**: Clean separation of concerns with dedicated services

## Architecture

The application is built with a modular service-oriented architecture:

### Services

#### 1. AsanaService (`services/asana-service.js`)
Handles all Asana-related functionality:
- API authentication and connection
- Workspace and project management
- Task data retrieval with hierarchy support
- Data transformation to Gantt format
- Field mapping support

**Key Methods:**
- `setPAT(pat)` - Set Personal Access Token
- `connect()` - Connect to Asana and get workspaces
- `getProjects()` - Get projects from workspace
- `getProjectData(projectGid)` - Get complete project data with task details
- `convertToGanttFormat(tasks, fieldMappings)` - Convert Asana tasks to Gantt format

#### 2. AirtableService (`services/airtable-service.js`)
Handles all Airtable-related functionality:
- API authentication and connection
- Table data retrieval
- Schema introspection
- Data transformation to Gantt format
- CRUD operations support

**Key Methods:**
- `setCredentials(apiKey, baseId)` - Set API credentials
- `testConnection(tableName)` - Test connection to Airtable
- `getTableRecords(tableName, options)` - Get records from table
- `getTableSchema(tableName)` - Get table field information
- `convertToGanttFormat(records, fieldMappings)` - Convert Airtable records to Gantt format

#### 3. FieldMappingService (`services/field-mapping-service.js`)
Manages field mapping configuration:
- Field mapping persistence (localStorage)
- Validation of mappings
- Default mapping suggestions
- Multi-source mapping support

**Key Methods:**
- `loadFieldMappings(dataSource)` - Load mappings for a data source
- `saveFieldMappings(mappings, dataSource)` - Save mappings to localStorage
- `validateMappings(mappings)` - Validate mapping configuration
- `generateMappingSuggestions(sourceFields, dataSource)` - Auto-suggest mappings

### Main Application (`app.js`)

The main `ProjectGanttApp` class orchestrates the services and manages the UI:
- Data source selection (Asana/Airtable)
- Connection management
- Project/table selection
- Gantt chart rendering
- Field mapping dialog

## Usage

### Connecting to Asana

1. Select "Asana" from the data source dropdown
2. Enter your Asana Personal Access Token (PAT)
3. Click "Connect to Asana"
4. Select a project from the dropdown
5. View the Gantt chart

### Connecting to Airtable

1. Select "Airtable" from the data source dropdown
2. Enter your Airtable API key
3. Enter your Airtable Base ID
4. Enter the table name
5. Click "Connect to Airtable"
6. View the Gantt chart

### Field Mapping

Click "⚙️ Configure Field Mapping" to customize how source fields map to Gantt chart properties:

- **Required fields**: `id`, `name`, `startTime`, `endTime`
- **Optional fields**: `progress`, `parentId`, `dependencies`

Field mappings are saved per data source and persist between sessions.

## Data Source Requirements

### Asana
- Valid Personal Access Token with project access
- Projects with tasks that have start/due dates

### Airtable
- Valid API key
- Base ID and table name
- Table should contain date fields for timeline visualization

## File Structure

```
├── index.html              # Main HTML file
├── app.js                  # Main application class
├── styles.css              # Styling
├── services/
│   ├── asana-service.js    # Asana integration service
│   ├── airtable-service.js # Airtable integration service
│   └── field-mapping-service.js # Field mapping management
└── README.md               # This file
```

## Dependencies

- [ApexCharts Gantt](https://cdn.jsdelivr.net/npm/apexgantt) - Gantt chart rendering
- Modern browser with ES6+ support
- No additional build tools required

## Development

The application uses vanilla JavaScript with ES6 classes. No build process is required - simply serve the files from a web server.

For local development:
```bash
python -m http.server 8000
# Then visit http://localhost:8000
```

## API Rate Limits

Be mindful of API rate limits:
- **Asana**: 1,500 requests per minute
- **Airtable**: 5 requests per second per base

The application fetches detailed task information which may require multiple API calls for projects with many tasks.