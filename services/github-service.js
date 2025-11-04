class GitHubService {
    constructor() {
        this.token = null;
        this.owner = null;
        this.repo = null;
        
        // Define GitHub Projects fields based on GraphQL API
        this.githubFields = [
            { key: 'id', type: 'string', description: 'Unique identifier for the item' },
            { key: 'title', type: 'string', description: 'Title of the issue/task' },
            { key: 'body', type: 'string', description: 'Description/body content' },
            { key: 'state', type: 'string', description: 'State (OPEN, CLOSED, etc.)' },
            { key: 'assignees', type: 'array', description: 'Array of assigned users' },
            { key: 'labels', type: 'array', description: 'Array of labels' },
            { key: 'milestone', type: 'object', description: 'Milestone information' },
            { key: 'milestone.title', type: 'string', description: 'Milestone title' },
            { key: 'milestone.dueOn', type: 'date', description: 'Milestone due date' },
            { key: 'createdAt', type: 'datetime', description: 'Creation timestamp' },
            { key: 'updatedAt', type: 'datetime', description: 'Last update timestamp' },
            { key: 'closedAt', type: 'datetime', description: 'Closure timestamp' },
            { key: 'number', type: 'number', description: 'Issue/PR number' },
            { key: 'url', type: 'string', description: 'URL to the item' },
            // Project-specific fields
            { key: 'fieldValues.nodes', type: 'array', description: 'Custom project field values' },
            { key: 'status', type: 'string', description: 'Project status field' },
            { key: 'priority', type: 'string', description: 'Project priority field' },
            { key: 'startDate', type: 'date', description: 'Project start date field' },
            { key: 'targetDate', type: 'date', description: 'Project target date field' },
            { key: 'iteration', type: 'string', description: 'Project iteration field' }
        ];
    }
    
    /**
     * Set GitHub authentication credentials
     * @param {string} token - GitHub Personal Access Token
     * @param {string} owner - Repository owner (username or organization)
     * @param {string} repo - Repository name
     */
    setCredentials(token, owner, repo) {
        this.token = token;
        this.owner = owner;
        this.repo = repo;
    }
    
    /**
     * Get available GitHub field definitions
     * @returns {Array} Array of GitHub field definitions
     */
    getGitHubFields() {
        return this.githubFields;
    }
    
    /**
     * Make a request to the GitHub REST API
     * @param {string} endpoint - API endpoint
     * @param {Object} params - Query parameters
     * @param {string} method - HTTP method
     * @param {Object} body - Request body
     * @returns {Promise} API response data
     */
    async makeRestRequest(endpoint, params = {}, method = 'GET', body = null) {
        if (!this.token) {
            throw new Error('Token not set. Call setCredentials() first.');
        }
        
        const url = new URL(`https://api.github.com${endpoint}`);
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
        
        const options = {
            method,
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'X-GitHub-Api-Version': '2022-11-28'
            }
        };
        
        if (body && (method === 'POST' || method === 'PATCH')) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `GitHub API Error: ${response.status}`);
        }
        
        return await response.json();
    }
    
    /**
     * Make a request to the GitHub GraphQL API
     * @param {string} query - GraphQL query
     * @param {Object} variables - GraphQL variables
     * @returns {Promise} API response data
     */
    async makeGraphQLRequest(query, variables = {}) {
        if (!this.token) {
            throw new Error('Token not set. Call setCredentials() first.');
        }
        
        const response = await fetch('https://api.github.com/graphql', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query, variables })
        });
        
        if (!response.ok) {
            throw new Error(`GitHub GraphQL API Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.errors) {
            throw new Error(`GraphQL Error: ${data.errors.map(e => e.message).join(', ')}`);
        }
        
        return data.data;
    }
    
    /**
     * Test connection to GitHub
     * @returns {Promise<boolean>} True if connection successful
     */
    async testConnection() {
        if (!this.token || !this.owner || !this.repo) {
            throw new Error('Credentials not set. Call setCredentials() first.');
        }
        
        try {
            // Test by getting repository info
            await this.makeRestRequest(`/repos/${this.owner}/${this.repo}`);
            return true;
        } catch (error) {
            throw new Error(`Failed to connect to GitHub: ${error.message}`);
        }
    }
    
    /**
     * Get projects for the repository
     * @returns {Promise<Array>} Array of projects
     */
    async getProjects() {
        if (!this.owner || !this.repo) {
            throw new Error('Repository not set. Call setCredentials() first.');
        }
        
        try {
            // Get Projects V2 (new GitHub Projects)
            const query = `
                query($owner: String!, $repo: String!) {
                    repository(owner: $owner, name: $repo) {
                        projectsV2(first: 20) {
                            nodes {
                                id
                                title
                                shortDescription
                                url
                                number
                            }
                        }
                    }
                    organization(login: $owner) {
                        projectsV2(first: 20) {
                            nodes {
                                id
                                title
                                shortDescription
                                url
                                number
                            }
                        }
                    }
                }
            `;
            
            const data = await this.makeGraphQLRequest(query, {
                owner: this.owner,
                repo: this.repo
            });
            
            const projects = [];
            
            // Add repository projects
            if (data.repository?.projectsV2?.nodes) {
                projects.push(...data.repository.projectsV2.nodes.map(p => ({
                    ...p,
                    type: 'repository'
                })));
            }
            
            // Add organization projects
            if (data.organization?.projectsV2?.nodes) {
                projects.push(...data.organization.projectsV2.nodes.map(p => ({
                    ...p,
                    type: 'organization'
                })));
            }
            
            return projects;
        } catch (error) {
            throw new Error(`Failed to get projects: ${error.message}`);
        }
    }
    
    /**
     * Get issues from the repository
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Array of issues
     */
    async getIssues(options = {}) {
        if (!this.owner || !this.repo) {
            throw new Error('Repository not set. Call setCredentials() first.');
        }
        
        try {
            const params = {
                state: options.state || 'all',
                per_page: options.per_page || 100,
                sort: options.sort || 'created',
                direction: options.direction || 'desc'
            };
            
            if (options.milestone) params.milestone = options.milestone;
            if (options.assignee) params.assignee = options.assignee;
            if (options.labels) params.labels = options.labels;
            
            const issues = await this.makeRestRequest(`/repos/${this.owner}/${this.repo}/issues`, params);
            
            // Filter out pull requests (GitHub API includes PRs in issues)
            return issues.filter(issue => !issue.pull_request);
        } catch (error) {
            throw new Error(`Failed to get issues: ${error.message}`);
        }
    }
    
    /**
     * Get project items with details
     * @param {string} projectId - Project ID (node ID)
     * @returns {Promise<Array>} Array of project items
     */
    async getProjectItems(projectId) {
        try {
            const query = `
                query($projectId: ID!) {
                    node(id: $projectId) {
                        ... on ProjectV2 {
                            items(first: 100) {
                                nodes {
                                    id
                                    content {
                                        ... on Issue {
                                            id
                                            title
                                            body
                                            state
                                            number
                                            url
                                            createdAt
                                            updatedAt
                                            closedAt
                                            assignees(first: 10) {
                                                nodes {
                                                    login
                                                    name
                                                }
                                            }
                                            labels(first: 10) {
                                                nodes {
                                                    name
                                                    color
                                                }
                                            }
                                            milestone {
                                                title
                                                dueOn
                                            }
                                        }
                                        ... on PullRequest {
                                            id
                                            title
                                            body
                                            state
                                            number
                                            url
                                            createdAt
                                            updatedAt
                                            closedAt
                                            assignees(first: 10) {
                                                nodes {
                                                    login
                                                    name
                                                }
                                            }
                                            labels(first: 10) {
                                                nodes {
                                                    name
                                                    color
                                                }
                                            }
                                        }
                                    }
                                    fieldValues(first: 20) {
                                        nodes {
                                            ... on ProjectV2ItemFieldTextValue {
                                                text
                                                field {
                                                    ... on ProjectV2FieldCommon {
                                                        name
                                                    }
                                                }
                                            }
                                            ... on ProjectV2ItemFieldDateValue {
                                                date
                                                field {
                                                    ... on ProjectV2FieldCommon {
                                                        name
                                                    }
                                                }
                                            }
                                            ... on ProjectV2ItemFieldSingleSelectValue {
                                                name
                                                field {
                                                    ... on ProjectV2FieldCommon {
                                                        name
                                                    }
                                                }
                                            }
                                            ... on ProjectV2ItemFieldNumberValue {
                                                number
                                                field {
                                                    ... on ProjectV2FieldCommon {
                                                        name
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            `;
            
            const data = await this.makeGraphQLRequest(query, { projectId });
            
            if (!data.node?.items?.nodes) {
                return [];
            }
            
            // Process and enrich the items
            return data.node.items.nodes.map(item => {
                const content = item.content || {};
                const fieldValues = {};
                
                // Process custom field values
                if (item.fieldValues?.nodes) {
                    item.fieldValues.nodes.forEach(fieldValue => {
                        const fieldName = fieldValue.field?.name;
                        if (fieldName) {
                            if (fieldValue.text !== undefined) {
                                fieldValues[fieldName] = fieldValue.text;
                            } else if (fieldValue.date !== undefined) {
                                fieldValues[fieldName] = fieldValue.date;
                            } else if (fieldValue.name !== undefined) {
                                fieldValues[fieldName] = fieldValue.name;
                            } else if (fieldValue.number !== undefined) {
                                fieldValues[fieldName] = fieldValue.number;
                            }
                        }
                    });
                }
                
                return {
                    id: content.id || item.id,
                    title: content.title || 'Untitled',
                    body: content.body || '',
                    state: content.state || 'UNKNOWN',
                    number: content.number,
                    url: content.url,
                    createdAt: content.createdAt,
                    updatedAt: content.updatedAt,
                    closedAt: content.closedAt,
                    assignees: content.assignees?.nodes || [],
                    labels: content.labels?.nodes || [],
                    milestone: content.milestone,
                    fieldValues: fieldValues,
                    // Convenience fields for common project fields
                    status: fieldValues['Status'] || fieldValues['Column'] || content.state,
                    priority: fieldValues['Priority'],
                    startDate: fieldValues['Start Date'] || fieldValues['Start'],
                    targetDate: fieldValues['Target Date'] || fieldValues['Due Date'] || content.milestone?.dueOn,
                    iteration: fieldValues['Iteration'] || fieldValues['Sprint']
                };
            });
        } catch (error) {
            throw new Error(`Failed to get project items: ${error.message}`);
        }
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
     * Convert GitHub items to Gantt format using field mappings
     * @param {Array} items - Array of GitHub project items
     * @param {Object} fieldMappings - Mapping configuration
     * @returns {Array} Array of Gantt-formatted tasks
     */
    convertToGanttFormat(items, fieldMappings) {
        const ganttSeries = [];
        
        items.forEach(item => {
            // Get mapped field values
            const idField = fieldMappings['id'] || 'id';
            const nameField = fieldMappings['name'] || 'title';
            const startField = fieldMappings['startTime'] || 'startDate';
            const endField = fieldMappings['endTime'] || 'targetDate';
            const progressField = fieldMappings['progress'] || 'progress';
            const parentField = fieldMappings['parentId'] || 'parent';
            
            const taskId = this.getNestedValue(item, idField);
            const name = this.getNestedValue(item, nameField) || 'Untitled Task';
            const startValue = this.getNestedValue(item, startField);
            const endValue = this.getNestedValue(item, endField);
            const parentId = this.getNestedValue(item, parentField);
            
            // Calculate progress based on state
            let progress = this.getNestedValue(item, progressField) || 0;
            if (typeof progress !== 'number') {
                // Calculate progress from state
                if (item.state === 'CLOSED' || item.status === 'Done') {
                    progress = 100;
                } else if (item.status === 'In Progress' || item.state === 'OPEN') {
                    progress = 50;
                } else {
                    progress = 0;
                }
            }
            
            // Skip items without dates
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
     * Get project data including items and details
     * @param {string} projectId - Project ID
     * @returns {Promise<Object>} Object containing project items
     */
    async getProjectData(projectId) {
        try {
            const items = await this.getProjectItems(projectId);
            
            return {
                projectId,
                items: items
            };
        } catch (error) {
            throw new Error(`Failed to get project data: ${error.message}`);
        }
    }
}