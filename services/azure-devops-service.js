class AzureDevOpsService {
    constructor() {
        this.token = null;
        this.organization = null;
        this.project = null;
        
        // Define Azure DevOps work item fields
        this.azureDevOpsFields = [
            { key: 'id', type: 'number', description: 'Work item ID' },
            { key: 'fields["System.Title"]', type: 'string', description: 'Work item title' },
            { key: 'fields["System.Description"]', type: 'string', description: 'Work item description' },
            { key: 'fields["System.State"]', type: 'string', description: 'Work item state' },
            { key: 'fields["System.WorkItemType"]', type: 'string', description: 'Work item type (Task, User Story, etc.)' },
            { key: 'fields["System.AssignedTo"]', type: 'object', description: 'Assigned user' },
            { key: 'fields["System.AssignedTo"]["displayName"]', type: 'string', description: 'Assigned user display name' },
            { key: 'fields["System.CreatedDate"]', type: 'datetime', description: 'Creation date' },
            { key: 'fields["System.ChangedDate"]', type: 'datetime', description: 'Last modified date' },
            { key: 'fields["System.ClosedDate"]', type: 'datetime', description: 'Closed date' },
            { key: 'fields["Microsoft.VSTS.Scheduling.StartDate"]', type: 'date', description: 'Start date' },
            { key: 'fields["Microsoft.VSTS.Scheduling.TargetDate"]', type: 'date', description: 'Target/due date' },
            { key: 'fields["Microsoft.VSTS.Scheduling.FinishDate"]', type: 'date', description: 'Finish date' },
            { key: 'fields["Microsoft.VSTS.Common.Priority"]', type: 'number', description: 'Priority (1-4)' },
            { key: 'fields["Microsoft.VSTS.Common.Severity"]', type: 'string', description: 'Severity level' },
            { key: 'fields["Microsoft.VSTS.Common.Activity"]', type: 'string', description: 'Activity type' },
            { key: 'fields["Microsoft.VSTS.Scheduling.RemainingWork"]', type: 'number', description: 'Remaining work hours' },
            { key: 'fields["Microsoft.VSTS.Scheduling.CompletedWork"]', type: 'number', description: 'Completed work hours' },
            { key: 'fields["Microsoft.VSTS.Scheduling.OriginalEstimate"]', type: 'number', description: 'Original estimate hours' },
            { key: 'fields["System.Parent"]', type: 'number', description: 'Parent work item ID' },
            { key: 'fields["System.IterationPath"]', type: 'string', description: 'Iteration/sprint path' },
            { key: 'fields["System.AreaPath"]', type: 'string', description: 'Area path' },
            { key: 'fields["System.Tags"]', type: 'string', description: 'Tags (semicolon separated)' },
            { key: 'url', type: 'string', description: 'Work item URL' }
        ];
    }
    
    /**
     * Set Azure DevOps authentication credentials
     * @param {string} token - Personal Access Token
     * @param {string} organization - Organization name
     * @param {string} project - Project name
     */
    setCredentials(token, organization, project) {
        this.token = token;
        this.organization = organization;
        this.project = project;
    }
    
    /**
     * Get available Azure DevOps field definitions
     * @returns {Array} Array of Azure DevOps field definitions
     */
    getAzureDevOpsFields() {
        return this.azureDevOpsFields;
    }
    
    /**
     * Make a request to the Azure DevOps REST API
     * @param {string} endpoint - API endpoint
     * @param {Object} params - Query parameters
     * @param {string} method - HTTP method
     * @param {Object} body - Request body
     * @returns {Promise} API response data
     */
    async makeRequest(endpoint, params = {}, method = 'GET', body = null) {
        if (!this.token || !this.organization) {
            throw new Error('Credentials not set. Call setCredentials() first.');
        }
        
        const baseUrl = `https://dev.azure.com/${this.organization}`;
        const url = new URL(`${baseUrl}${endpoint}`);
        
        // Add API version
        params['api-version'] = params['api-version'] || '7.0';
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
        
        const options = {
            method,
            headers: {
                'Authorization': `Basic ${btoa(':' + this.token)}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };
        
        if (body && (method === 'POST' || method === 'PATCH')) {
            options.body = JSON.stringify(body);
        }
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `Azure DevOps API Error: ${response.status}`);
        }
        
        return await response.json();
    }
    
    /**
     * Test connection to Azure DevOps
     * @returns {Promise<boolean>} True if connection successful
     */
    async testConnection() {
        if (!this.token || !this.organization) {
            throw new Error('Credentials not set. Call setCredentials() first.');
        }
        
        try {
            // Test by getting organization info
            await this.makeRequest('/_apis/projects');
            return true;
        } catch (error) {
            throw new Error(`Failed to connect to Azure DevOps: ${error.message}`);
        }
    }
    
    /**
     * Get projects from the organization
     * @returns {Promise<Array>} Array of projects
     */
    async getProjects() {
        try {
            const response = await this.makeRequest('/_apis/projects');
            return response.value || [];
        } catch (error) {
            throw new Error(`Failed to get projects: ${error.message}`);
        }
    }
    
    /**
     * Get teams for the current project
     * @returns {Promise<Array>} Array of teams
     */
    async getTeams() {
        if (!this.project) {
            throw new Error('Project not set. Call setCredentials() first.');
        }
        
        try {
            const response = await this.makeRequest(`/${this.project}/_apis/teams`);
            return response.value || [];
        } catch (error) {
            throw new Error(`Failed to get teams: ${error.message}`);
        }
    }
    
    /**
     * Get work items from the project
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Array of work items
     */
    async getWorkItems(options = {}) {
        if (!this.project) {
            throw new Error('Project not set. Call setCredentials() first.');
        }
        
        try {
            // Build WIQL query
            let wiql = `SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], [System.AssignedTo] FROM WorkItems`;
            
            const conditions = [];
            
            // Add project filter
            conditions.push(`[System.TeamProject] = '${this.project}'`);
            
            // Add type filter if specified
            if (options.workItemTypes && options.workItemTypes.length > 0) {
                const types = options.workItemTypes.map(t => `'${t}'`).join(', ');
                conditions.push(`[System.WorkItemType] IN (${types})`);
            }
            
            // Add state filter if specified
            if (options.states && options.states.length > 0) {
                const states = options.states.map(s => `'${s}'`).join(', ');
                conditions.push(`[System.State] IN (${states})`);
            }
            
            // Add assignee filter if specified
            if (options.assignedTo) {
                conditions.push(`[System.AssignedTo] = '${options.assignedTo}'`);
            }
            
            // Add iteration filter if specified
            if (options.iteration) {
                conditions.push(`[System.IterationPath] UNDER '${this.project}\\${options.iteration}'`);
            }
            
            if (conditions.length > 0) {
                wiql += ` WHERE ${conditions.join(' AND ')}`;
            }
            
            // Add ordering
            wiql += ` ORDER BY [System.Id] DESC`;
            
            // Execute WIQL query
            const queryResponse = await this.makeRequest(`/${this.project}/_apis/wit/wiql`, {}, 'POST', {
                query: wiql
            });
            
            if (!queryResponse.workItems || queryResponse.workItems.length === 0) {
                return [];
            }
            
            // Get work item IDs
            const workItemIds = queryResponse.workItems.map(wi => wi.id);
            
            // Get detailed work item data
            const workItems = await this.getWorkItemDetails(workItemIds);
            
            return workItems;
        } catch (error) {
            throw new Error(`Failed to get work items: ${error.message}`);
        }
    }
    
    /**
     * Get detailed information for specific work items
     * @param {Array} workItemIds - Array of work item IDs
     * @returns {Promise<Array>} Array of detailed work items
     */
    async getWorkItemDetails(workItemIds) {
        if (!workItemIds || workItemIds.length === 0) {
            return [];
        }
        
        try {
            // Azure DevOps allows batch requests for up to 200 work items
            const batchSize = 200;
            const allWorkItems = [];
            
            for (let i = 0; i < workItemIds.length; i += batchSize) {
                const batch = workItemIds.slice(i, i + batchSize);
                const ids = batch.join(',');
                
                const response = await this.makeRequest('/_apis/wit/workitems', {
                    ids: ids,
                    '$expand': 'all'
                });
                
                if (response.value) {
                    allWorkItems.push(...response.value);
                }
            }
            
            return allWorkItems;
        } catch (error) {
            throw new Error(`Failed to get work item details: ${error.message}`);
        }
    }
    
    /**
     * Get iterations (sprints) for the project
     * @param {string} team - Team name (optional)
     * @returns {Promise<Array>} Array of iterations
     */
    async getIterations(team = null) {
        if (!this.project) {
            throw new Error('Project not set. Call setCredentials() first.');
        }
        
        try {
            let endpoint = `/${this.project}/_apis/work/teamsettings/iterations`;
            if (team) {
                endpoint = `/${this.project}/${team}/_apis/work/teamsettings/iterations`;
            }
            
            const response = await this.makeRequest(endpoint);
            return response.value || [];
        } catch (error) {
            throw new Error(`Failed to get iterations: ${error.message}`);
        }
    }
    
    /**
     * Get work item types for the project
     * @returns {Promise<Array>} Array of work item types
     */
    async getWorkItemTypes() {
        if (!this.project) {
            throw new Error('Project not set. Call setCredentials() first.');
        }
        
        try {
            const response = await this.makeRequest(`/${this.project}/_apis/wit/workitemtypes`);
            return response.value || [];
        } catch (error) {
            throw new Error(`Failed to get work item types: ${error.message}`);
        }
    }
    
    /**
     * Get a nested value from an object using dot notation with support for brackets
     * @param {Object} obj - Object to search in
     * @param {string} path - Dot notation path (supports ["field"] syntax)
     * @returns {*} The value at the path or undefined
     */
    getNestedValue(obj, path) {
        if (!path || typeof path !== 'string') {
            return undefined;
        }
        
        // Handle Azure DevOps field syntax like fields["System.Title"]
        // Check if this is a fields["FieldName"] pattern
        const fieldsPattern = /^fields\["([^"]+)"\]$/;
        const match = path.match(fieldsPattern);
        
        if (match) {
            // Direct access to fields object with the field name as key
            const fieldName = match[1];
            return obj.fields && obj.fields[fieldName];
        }
        
        // Handle regular dot notation for other paths
        return path.split('.').reduce((current, key) => {
            if (current && typeof current === 'object') {
                return current[key];
            }
            return undefined;
        }, obj);
    }
    
    /**
     * Convert Azure DevOps work items to Gantt format using field mappings
     * @param {Array} workItems - Array of Azure DevOps work items
     * @param {Object} fieldMappings - Mapping configuration
     * @returns {Array} Array of Gantt-formatted tasks
     */
    convertToGanttFormat(workItems, fieldMappings) {
        const ganttSeries = [];
        
        workItems.forEach(workItem => {
            // Get mapped field values
            const idField = fieldMappings['id'] || 'id';
            const nameField = fieldMappings['name'] || 'fields["System.Title"]';
            const startField = fieldMappings['startTime'] || 'fields["Microsoft.VSTS.Scheduling.StartDate"]';
            const endField = fieldMappings['endTime'] || 'fields["Microsoft.VSTS.Scheduling.TargetDate"]';
            const progressField = fieldMappings['progress'] || 'progress';
            const parentField = fieldMappings['parentId'] || 'fields["System.Parent"]';
            
            const taskId = this.getNestedValue(workItem, idField);
            const name = this.getNestedValue(workItem, nameField) || 'Untitled Work Item';
            const startValue = this.getNestedValue(workItem, startField);
            const endValue = this.getNestedValue(workItem, endField);
            const parentId = this.getNestedValue(workItem, parentField);
            
            // Calculate progress based on state and work completion
            let progress = this.getNestedValue(workItem, progressField) || 0;
            if (typeof progress !== 'number') {
                const state = this.getNestedValue(workItem, 'fields["System.State"]');
                const completedWork = this.getNestedValue(workItem, 'fields["Microsoft.VSTS.Scheduling.CompletedWork"]') || 0;
                const originalEstimate = this.getNestedValue(workItem, 'fields["Microsoft.VSTS.Scheduling.OriginalEstimate"]') || 0;
                
                if (originalEstimate > 0) {
                    progress = Math.min(100, (completedWork / originalEstimate) * 100);
                } else {
                    // Calculate based on state
                    switch (state?.toLowerCase()) {
                        case 'done':
                        case 'closed':
                        case 'completed':
                            progress = 100;
                            break;
                        case 'active':
                        case 'in progress':
                        case 'committed':
                            progress = 50;
                            break;
                        default:
                            progress = 0;
                    }
                }
            }
            
            // Skip work items without dates
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
     * @returns {string} Formatted date string (never null)
     */
    formatDate(dateString) {
        // If dateString is null/undefined/empty, use today's date
        if (!dateString) {
            const today = new Date();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const year = today.getFullYear();
            return `${month}-${day}-${year}`;
        }
        
        const date = new Date(dateString);
        // If invalid date, use today's date
        if (isNaN(date.getTime())) {
            const today = new Date();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const year = today.getFullYear();
            return `${month}-${day}-${year}`;
        }
        
        // Convert to MM-DD-YYYY format
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        
        return `${month}-${day}-${year}`;
    }
    
    /**
     * Get project data including work items
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Object containing work items
     */
    async getProjectData(options = {}) {
        try {
            const workItems = await this.getWorkItems(options);
            
            return {
                project: this.project,
                organization: this.organization,
                workItems: workItems
            };
        } catch (error) {
            throw new Error(`Failed to get project data: ${error.message}`);
        }
    }
    
    /**
     * Get common work item query options
     * @returns {Object} Common query options for different scenarios
     */
    getCommonQueryOptions() {
        return {
            all: {},
            userStories: {
                workItemTypes: ['User Story']
            },
            tasks: {
                workItemTypes: ['Task']
            },
            bugs: {
                workItemTypes: ['Bug']
            },
            features: {
                workItemTypes: ['Feature']
            },
            epics: {
                workItemTypes: ['Epic']
            },
            active: {
                states: ['Active', 'In Progress', 'Committed']
            },
            completed: {
                states: ['Done', 'Closed', 'Completed']
            }
        };
    }
}