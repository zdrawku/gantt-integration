class JiraService {
    constructor() {
        this.baseUrl = null;
        this.email = null;
        this.apiToken = null;
        this.isCloud = true; // Default to Jira Cloud
        
        // Define Jira fields based on REST API
        this.jiraFields = [
            { key: 'id', type: 'string', description: 'Issue ID' },
            { key: 'key', type: 'string', description: 'Issue key (e.g., PROJ-123)' },
            { key: 'fields.summary', type: 'string', description: 'Issue summary/title' },
            { key: 'fields.description', type: 'string', description: 'Issue description' },
            { key: 'fields.status.name', type: 'string', description: 'Issue status name' },
            { key: 'fields.status.statusCategory.name', type: 'string', description: 'Status category (To Do, In Progress, Done)' },
            { key: 'fields.issuetype.name', type: 'string', description: 'Issue type (Story, Task, Bug, Epic, etc.)' },
            { key: 'fields.priority.name', type: 'string', description: 'Priority name' },
            { key: 'fields.assignee.displayName', type: 'string', description: 'Assignee display name' },
            { key: 'fields.assignee.emailAddress', type: 'string', description: 'Assignee email' },
            { key: 'fields.reporter.displayName', type: 'string', description: 'Reporter display name' },
            { key: 'fields.created', type: 'datetime', description: 'Creation date' },
            { key: 'fields.updated', type: 'datetime', description: 'Last update date' },
            { key: 'fields.duedate', type: 'date', description: 'Due date' },
            { key: 'fields.resolutiondate', type: 'datetime', description: 'Resolution date' },
            // Epic and Sprint fields
            { key: 'fields.parent.key', type: 'string', description: 'Parent issue key' },
            { key: 'fields.parent.fields.summary', type: 'string', description: 'Parent issue summary' },
            { key: 'fields.epic', type: 'object', description: 'Epic information' },
            { key: 'fields.sprint', type: 'array', description: 'Sprint information' },
            // Time tracking fields
            { key: 'fields.timeoriginalestimate', type: 'number', description: 'Original estimate (seconds)' },
            { key: 'fields.timeestimate', type: 'number', description: 'Remaining estimate (seconds)' },
            { key: 'fields.timespent', type: 'number', description: 'Time spent (seconds)' },
            { key: 'fields.progress.percent', type: 'number', description: 'Progress percentage' },
            // Custom fields (common ones)
            { key: 'fields.customfield_10001', type: 'string', description: 'Story Points (typical field ID)' },
            { key: 'fields.customfield_10002', type: 'date', description: 'Start Date (typical field ID)' },
            { key: 'fields.customfield_10003', type: 'date', description: 'Target Date (typical field ID)' },
            // Labels and components
            { key: 'fields.labels', type: 'array', description: 'Issue labels' },
            { key: 'fields.components', type: 'array', description: 'Issue components' },
            { key: 'fields.fixVersions', type: 'array', description: 'Fix versions' },
            { key: 'fields.versions', type: 'array', description: 'Affected versions' }
        ];
    }
    
    /**
     * Set Jira authentication credentials
     * @param {string} baseUrl - Jira instance URL (e.g., https://company.atlassian.net or https://jira.company.com)
     * @param {string} email - User email (for Jira Cloud) or username (for Server)
     * @param {string} apiToken - API token (Cloud) or password (Server)
     * @param {boolean} isCloud - Whether this is Jira Cloud or Server/Data Center
     */
    setCredentials(baseUrl, email, apiToken, isCloud = true) {
        this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
        this.email = email;
        this.apiToken = apiToken;
        this.isCloud = isCloud;
    }
    
    /**
     * Get available Jira field definitions
     * @returns {Array} Array of Jira field definitions
     */
    getJiraFields() {
        return this.jiraFields;
    }
    
    /**
     * Make a request to the Jira REST API
     * @param {string} endpoint - API endpoint
     * @param {Object} params - Query parameters
     * @param {string} method - HTTP method
     * @param {Object} body - Request body
     * @returns {Promise} API response data
     */
    async makeRequest(endpoint, params = {}, method = 'GET', body = null) {
        if (!this.baseUrl || !this.email || !this.apiToken) {
            throw new Error('Credentials not set. Call setCredentials() first.');
        }
        
        const url = new URL(`${this.baseUrl}/rest/api/3${endpoint}`);
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
        
        // Create authorization header
        const auth = btoa(`${this.email}:${this.apiToken}`);
        
        const options = {
            method,
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        };
        
        if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(body);
        }
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            const errorMessage = error.errorMessages ? error.errorMessages.join(', ') : 
                                error.message || `Jira API Error: ${response.status}`;
            throw new Error(errorMessage);
        }
        
        return await response.json();
    }
    
    /**
     * Test connection to Jira
     * @returns {Promise<boolean>} True if connection successful
     */
    async testConnection() {
        if (!this.baseUrl || !this.email || !this.apiToken) {
            throw new Error('Credentials not set. Call setCredentials() first.');
        }
        
        try {
            // Test by getting current user info
            await this.makeRequest('/myself');
            return true;
        } catch (error) {
            throw new Error(`Failed to connect to Jira: ${error.message}`);
        }
    }
    
    /**
     * Get projects from Jira
     * @returns {Promise<Array>} Array of projects
     */
    async getProjects() {
        try {
            const projects = await this.makeRequest('/project', {
                expand: 'description,lead,url,projectKeys'
            });
            
            return projects.map(project => ({
                id: project.id,
                key: project.key,
                name: project.name,
                description: project.description || '',
                projectTypeKey: project.projectTypeKey,
                lead: project.lead?.displayName || '',
                url: project.self
            }));
        } catch (error) {
            throw new Error(`Failed to get projects: ${error.message}`);
        }
    }
    
    /**
     * Get issues from a project
     * @param {string} projectKey - Project key
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Array of issues
     */
    async getIssues(projectKey, options = {}) {
        try {
            const jql = this.buildJQL(projectKey, options);
            const params = {
                jql: jql,
                expand: 'changelog',
                fields: '*all',
                maxResults: options.maxResults || 1000,
                startAt: options.startAt || 0
            };
            
            const result = await this.makeRequest('/search', params);
            return result.issues || [];
        } catch (error) {
            throw new Error(`Failed to get issues: ${error.message}`);
        }
    }
    
    /**
     * Build JQL query based on options
     * @param {string} projectKey - Project key
     * @param {Object} options - Query options
     * @returns {string} JQL query string
     */
    buildJQL(projectKey, options) {
        let jql = `project = "${projectKey}"`;
        
        // Add issue type filter
        if (options.issueTypes && options.issueTypes.length > 0) {
            const types = options.issueTypes.map(type => `"${type}"`).join(', ');
            jql += ` AND issuetype IN (${types})`;
        }
        
        // Add status filter
        if (options.statuses && options.statuses.length > 0) {
            const statuses = options.statuses.map(status => `"${status}"`).join(', ');
            jql += ` AND status IN (${statuses})`;
        }
        
        // Add assignee filter
        if (options.assignee) {
            if (options.assignee === 'currentUser()') {
                jql += ` AND assignee = currentUser()`;
            } else if (options.assignee === 'unassigned') {
                jql += ` AND assignee is EMPTY`;
            } else {
                jql += ` AND assignee = "${options.assignee}"`;
            }
        }
        
        // Add sprint filter
        if (options.sprint) {
            jql += ` AND sprint = "${options.sprint}"`;
        }
        
        // Add epic filter
        if (options.epic) {
            jql += ` AND "Epic Link" = "${options.epic}"`;
        }
        
        // Add date filters
        if (options.createdAfter) {
            jql += ` AND created >= "${options.createdAfter}"`;
        }
        
        if (options.updatedAfter) {
            jql += ` AND updated >= "${options.updatedAfter}"`;
        }
        
        // Add ordering
        jql += ` ORDER BY ${options.orderBy || 'created'} ${options.orderDirection || 'DESC'}`;
        
        return jql;
    }
    
    /**
     * Get issue types for a project
     * @param {string} projectKey - Project key
     * @returns {Promise<Array>} Array of issue types
     */
    async getIssueTypes(projectKey) {
        try {
            const project = await this.makeRequest(`/project/${projectKey}`);
            return project.issueTypes || [];
        } catch (error) {
            throw new Error(`Failed to get issue types: ${error.message}`);
        }
    }
    
    /**
     * Get sprints for a project (if using Jira Software)
     * @param {string} projectKey - Project key
     * @returns {Promise<Array>} Array of sprints
     */
    async getSprints(projectKey) {
        try {
            // This requires the Jira Software REST API
            const boards = await this.makeRequest(`/board`, {
                projectKeyOrId: projectKey
            });
            
            if (!boards.values || boards.values.length === 0) {
                return [];
            }
            
            const boardId = boards.values[0].id;
            const sprints = await this.makeRequest(`/board/${boardId}/sprint`);
            
            return sprints.values || [];
        } catch (error) {
            console.warn('Could not fetch sprints (Jira Software may not be available):', error.message);
            return [];
        }
    }
    
    /**
     * Get custom fields for the Jira instance
     * @returns {Promise<Array>} Array of custom fields
     */
    async getCustomFields() {
        try {
            const fields = await this.makeRequest('/field');
            
            return fields
                .filter(field => field.custom)
                .map(field => ({
                    id: field.id,
                    key: `fields.${field.id}`,
                    name: field.name,
                    type: this.mapFieldType(field.schema?.type),
                    description: `${field.name} (Custom Field)`
                }));
        } catch (error) {
            console.warn('Could not fetch custom fields:', error.message);
            return [];
        }
    }
    
    /**
     * Map Jira field types to our standard types
     * @param {string} jiraType - Jira field type
     * @returns {string} Mapped type
     */
    mapFieldType(jiraType) {
        const typeMap = {
            'string': 'string',
            'number': 'number',
            'date': 'date',
            'datetime': 'datetime',
            'array': 'array',
            'any': 'string',
            'option': 'string',
            'user': 'object',
            'project': 'object',
            'issuetype': 'object',
            'priority': 'object',
            'resolution': 'object',
            'status': 'object',
            'timetracking': 'object'
        };
        
        return typeMap[jiraType] || 'string';
    }
    
    /**
     * Get a nested value from an object using dot notation
     * @param {Object} obj - Object to search in
     * @param {string} path - Dot notation path
     * @returns {*} The value at the path or undefined
     */
    getNestedValue(obj, path) {
        if (!path || typeof path !== 'string') {
            return undefined;
        }
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
    
    /**
     * Convert Jira issues to Gantt format using field mappings
     * @param {Array} issues - Array of Jira issues
     * @param {Object} fieldMappings - Mapping configuration
     * @returns {Array} Array of Gantt-formatted tasks
     */
    convertToGanttFormat(issues, fieldMappings) {
        const ganttSeries = [];
        
        issues.forEach(issue => {
            // Get mapped field values
            const idField = fieldMappings['id'] || 'key';
            const nameField = fieldMappings['name'] || 'fields.summary';
            const startField = fieldMappings['startTime'] || 'fields.customfield_10002'; // Common start date field
            const endField = fieldMappings['endTime'] || 'fields.duedate';
            const progressField = fieldMappings['progress'] || 'fields.progress.percent';
            const parentField = fieldMappings['parentId'] || 'fields.parent.key';
            
            const taskId = this.getNestedValue(issue, idField);
            const name = this.getNestedValue(issue, nameField) || 'Untitled Issue';
            const startValue = this.getNestedValue(issue, startField);
            const endValue = this.getNestedValue(issue, endField);
            const parentId = this.getNestedValue(issue, parentField);
            
            // Calculate progress based on status or time tracking
            let progress = this.getNestedValue(issue, progressField) || 0;
            if (typeof progress !== 'number') {
                const status = this.getNestedValue(issue, 'fields.status.statusCategory.name');
                const timeSpent = this.getNestedValue(issue, 'fields.timespent') || 0;
                const originalEstimate = this.getNestedValue(issue, 'fields.timeoriginalestimate') || 0;
                
                if (originalEstimate > 0) {
                    progress = Math.min(100, (timeSpent / originalEstimate) * 100);
                } else {
                    // Calculate based on status category
                    switch (status?.toLowerCase()) {
                        case 'done':
                            progress = 100;
                            break;
                        case 'in progress':
                            progress = 50;
                            break;
                        case 'to do':
                        default:
                            progress = 0;
                    }
                }
            }
            
            // Skip issues without dates
            if (!startValue && !endValue) {
                return;
            }
            
            const ganttTask = {
                id: taskId,
                name: name,
                startTime: this.formatDate(startValue || endValue),
                endTime: this.formatDate(endValue || startValue),
                progress: progress
            };
            
            // Add parent relationship if exists
            if (parentId) {
                ganttTask.parentId = parentId;
                ganttTask.dependencies = [parentId];
            }
            
            ganttSeries.push(ganttTask);
        });
        
        return ganttSeries;
    }
    
    /**
     * Format date for Gantt chart (convert to MM-DD-YYYY)
     * @param {string} dateString - Date string
     * @returns {string|null} Formatted date string or null
     */
    formatDate(dateString) {
        if (!dateString) return null;
        
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return null;
        
        // Convert to MM-DD-YYYY format
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        
        return `${month}-${day}-${year}`;
    }
    
    /**
     * Get project data including issues
     * @param {string} projectKey - Project key
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Object containing project issues
     */
    async getProjectData(projectKey, options = {}) {
        try {
            const issues = await this.getIssues(projectKey, options);
            
            return {
                projectKey,
                issues: issues
            };
        } catch (error) {
            throw new Error(`Failed to get project data: ${error.message}`);
        }
    }
    
    /**
     * Get common query options for different scenarios
     * @returns {Object} Common query options
     */
    getCommonQueryOptions() {
        return {
            all: {},
            stories: {
                issueTypes: ['Story']
            },
            tasks: {
                issueTypes: ['Task']
            },
            bugs: {
                issueTypes: ['Bug']
            },
            epics: {
                issueTypes: ['Epic']
            },
            'sub-tasks': {
                issueTypes: ['Sub-task']
            },
            open: {
                statuses: ['Open', 'In Progress', 'Reopened']
            },
            closed: {
                statuses: ['Closed', 'Resolved', 'Done']
            },
            'my-issues': {
                assignee: 'currentUser()'
            },
            unassigned: {
                assignee: 'unassigned'
            }
        };
    }
    
    /**
     * Get enhanced field definitions including custom fields
     * @returns {Promise<Array>} Array of all available field definitions
     */
    async getEnhancedFields() {
        try {
            const customFields = await this.getCustomFields();
            return [...this.jiraFields, ...customFields];
        } catch (error) {
            console.warn('Could not load custom fields, using standard fields only');
            return this.jiraFields;
        }
    }
}