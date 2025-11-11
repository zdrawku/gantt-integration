class AsanaService {
    constructor() {
        this.pat = null;
        this.workspaceGid = null;
        
        // Define Asana fields based on the Swagger spec
        this.asanaFields = [
            { key: 'gid', type: 'string', description: 'Globally unique identifier of the task' },
            { key: 'name', type: 'string', description: 'Name of the task' },
            { key: 'start_on', type: 'date', description: 'The start date of the task (YYYY-MM-DD)' },
            { key: 'due_on', type: 'date', description: 'The due date of the task (YYYY-MM-DD)' },
            { key: 'due_at', type: 'datetime', description: 'The UTC date and time when task is due' },
            { key: 'completed', type: 'boolean', description: 'True if the task is marked complete' },
            { key: 'completed_percentage', type: 'number', description: 'Percentage completion (0-100)' },
            { key: 'completed_at', type: 'datetime', description: 'Time at which task was completed' },
            { key: 'parent', type: 'object', description: 'Parent task (contains gid)' },
            { key: 'parent.gid', type: 'string', description: 'Globally unique identifier of parent task' },
            { key: 'dependencies', type: 'array', description: 'Array of tasks this task depends on (each has gid)' },
            { key: 'dependencies[0].gid', type: 'string', description: 'GID of first dependency (used as parentId)' },
            { key: 'dependents', type: 'array', description: 'Array of tasks that depend on this task' },
            { key: 'assignee', type: 'object', description: 'User this task is assigned to' },
            { key: 'assignee.name', type: 'string', description: 'Name of the assignee' },
            { key: 'notes', type: 'string', description: 'Free-form text notes for the task' },
            { key: 'created_at', type: 'datetime', description: 'Time at which task was created' },
            { key: 'modified_at', type: 'datetime', description: 'Time at which task was last modified' },
            { key: 'resource_subtype', type: 'string', description: '' }
        ];
    }
    
    /**
     * Set the Personal Access Token for Asana API
     * @param {string} pat - Asana Personal Access Token
     */
    setPAT(pat) {
        this.pat = pat;
    }
    
    /**
     * Get available Asana fields
     * @returns {Array} Array of Asana field definitions
     */
    getAsanaFields() {
        return this.asanaFields;
    }
    
    /**
     * Make a request to the Asana API
     * @param {string} endpoint - API endpoint
     * @param {Object} params - Query parameters
     * @returns {Promise} API response data
     */
    async makeAsanaRequest(endpoint, params = {}) {
        if (!this.pat) {
            throw new Error('PAT not set. Call setPAT() first.');
        }
        
        const url = new URL(`https://app.asana.com/api/1.0${endpoint}`);
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${this.pat}`,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.errors?.[0]?.message || `API Error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.data;
    }
    
    /**
     * Connect to Asana and get workspaces
     * @returns {Promise<Array>} Array of workspaces
     */
    async connect() {
        if (!this.pat) {
            throw new Error('PAT not set. Call setPAT() first.');
        }
        
        try {
            // Get workspaces
            const workspaces = await this.makeAsanaRequest('/workspaces');
            
            if (!workspaces || workspaces.length === 0) {
                throw new Error('No workspaces found');
            }
            
            // Use the first workspace
            this.workspaceGid = workspaces[0].gid;
            
            return workspaces;
        } catch (error) {
            throw new Error(`Failed to connect to Asana: ${error.message}`);
        }
    }
    
    /**
     * Get projects from the current workspace
     * @returns {Promise<Array>} Array of projects
     */
    async getProjects() {
        if (!this.workspaceGid) {
            throw new Error('Not connected to a workspace. Call connect() first.');
        }
        
        try {
            const projects = await this.makeAsanaRequest('/projects', {
                workspace: this.workspaceGid
            });
            
            return projects;
        } catch (error) {
            throw new Error(`Failed to load projects: ${error.message}`);
        }
    }
    
    /**
     * Get tasks from a specific project
     * @param {string} projectGid - Project GID
     * @returns {Promise<Array>} Array of tasks
     */
    async getProjectTasks(projectGid) {
        try {
            return await this.makeAsanaRequest(`/projects/${projectGid}/tasks`, {
                opt_fields: 'name,completed,start_on,due_on,parent,dependencies,dependents,completed_percentage,subtasks,resource_subtype'
            });
        } catch (error) {
            throw new Error(`Failed to fetch project tasks: ${error.message}`);
        }
    }
    
    /**
     * Get detailed information for a list of tasks
     * @param {Array} tasks - Array of basic task objects
     * @returns {Promise<Array>} Array of detailed task objects
     */
    async getTaskDetails(tasks) {
        const detailedTasks = [];
        
        for (const task of tasks) {
            try {
                const details = await this.makeAsanaRequest(`/tasks/${task.gid}`, {
                    opt_fields: 'name,completed,start_on,due_on,parent,dependencies,dependents,completed_percentage,subtasks,resource_subtype'
                });
                
                // Fetch subtasks if they exist
                if (details.subtasks && details.subtasks.length > 0) {
                    details.subtasksDetails = await this.getTaskDetails(details.subtasks);
                }
                
                detailedTasks.push(details);
            } catch (error) {
                console.warn(`Failed to fetch details for task ${task.gid}:`, error);
            }
        }
        
        return detailedTasks;
    }
    
    /**
     * Get all project data including tasks and their details
     * @param {string} projectGid - Project GID
     * @returns {Promise<Object>} Object containing project tasks and details
     */
    async getProjectData(projectGid) {
        try {
            const tasks = await this.getProjectTasks(projectGid);
            
            if (!tasks || tasks.length === 0) {
                throw new Error('No tasks found in this project');
            }
            
            // const detailedTasks = await this.getTaskDetails(tasks);
            
            return {
                projectGid,
                tasks
                // tasks: detailedTasks
            };
        } catch (error) {
            throw new Error(`Failed to get project data: ${error.message}`);
        }
    }
    
    /**
     * Get a nested value from an object using dot notation
     * @param {Object} obj - Object to search in
     * @param {string} path - Dot notation path (e.g., 'parent.gid')
     * @returns {*} The value at the path or undefined
     */
    getNestedValue(obj, path) {
        if (!path || typeof path !== 'string') {
            return undefined;
        }
        
        // Handle array indexing in paths like "dependencies[0].gid"
        return path.split('.').reduce((current, key) => {
            // Check if key contains array indexing
            const arrayMatch = key.match(/^([^[]+)\[(\d+)\]$/);
            if (arrayMatch) {
                const [, arrayKey, index] = arrayMatch;
                return current?.[arrayKey]?.[parseInt(index)];
            }
            return current?.[key];
        }, obj);
    }
    
    /**
     * Convert Asana tasks to Gantt format using field mappings
     * @param {Array} tasks - Array of Asana tasks
     * @param {Object} fieldMappings - Mapping configuration
     * @returns {Array} Array of Gantt-formatted tasks
     */
    convertToGanttFormat(tasks, fieldMappings) {
        const ganttSeries = [];
        const taskMap = new Map();
        
        const processTask = (task, parentId = null) => {
            // Get mapped ID field
            const idField = fieldMappings['id'] || 'gid';
            const taskId = this.getNestedValue(task, idField);
            
            // avoid processing same task twice
            if (taskMap.has(taskId)) return;
            
            // Determine parent from parameter, dependencies, or Asana parent field
            const parentField = fieldMappings['parentId'] || 'parent.gid';
            let parentGid = parentId || this.getNestedValue(task, parentField) || null;
            
            // If no parent from hierarchy, check if this task has dependencies
            // and use the first dependency as the parent for Gantt display
            if (!parentGid && task.dependencies && task.dependencies.length > 0) {
                // Use the first dependency as the parent
                const firstDependency = task.dependencies[0];
                parentGid = firstDependency.gid || firstDependency;
            }
            
            // Get start and end date fields
            const startField = fieldMappings['startTime'] || 'start_on';
            const endField = fieldMappings['endTime'] || 'due_on';
            const startValue = this.getNestedValue(task, startField);
            const endValue = this.getNestedValue(task, endField);
            
            // Determine if this is a milestone (no start_on but has due_on) or regular task
            const isMilestone = !startValue && endValue;
            
            // Skip tasks without any dates
            if (!startValue && !endValue) {
                // still record mapping so children can reference parent even if parent has no dates
                if (parentGid && !taskMap.has(taskId)) {
                    taskMap.set(taskId, null);
                }
                // but do not add to ganttSeries
            } else {
                const nameField = fieldMappings['name'] || 'name';
                const progressField = fieldMappings['progress'] || 'completed_percentage';
                
                const ganttTask = {
                    id: taskId,
                    name: this.getNestedValue(task, nameField) || 'Untitled Task',
                    // For milestones, use due date for both start and end
                    startTime: this.formatDate(isMilestone ? endValue : (startValue || endValue)),
                    endTime: this.formatDate(endValue || startValue),
                    progress: task.completed ? 100 : (this.getNestedValue(task, progressField) || 0),
                    type: isMilestone ? 'milestone' : 'task'
                };
                
                // Attach parentId when known
                if (parentGid) {
                    ganttTask.parentId = parentGid;
                }
                
                // Set dependency for Gantt libs that use dependency field (singular)
                if (task.dependencies && task.dependencies.length > 0) {
                    // Use the first dependency for the singular dependency field
                    const firstDep = task.dependencies[0];
                    ganttTask.dependency = firstDep.gid || firstDep;
                }
                
                ganttSeries.push(ganttTask);
                taskMap.set(taskId, ganttTask);
            }
            
            // Process subtasks (if any) and ensure their parent is set to current task ID
            if (task.subtasksDetails && task.subtasksDetails.length > 0) {
                task.subtasksDetails.forEach(subtask => {
                    processTask(subtask, taskId);
                });
            }
        };
        
        // Process all tasks (not only top-level) so parent relationships from Asana are preserved
        tasks.forEach(task => processTask(task));
        
        return ganttSeries;
    }
    
    /**
     * Format date from YYYY-MM-DD to MM-DD-YYYY
     * @param {string} dateString - Date string in YYYY-MM-DD format
     * @returns {string|null} Formatted date string or null
     */
    formatDate(dateString) {
        if (!dateString) return null;
        
        // Convert from YYYY-MM-DD to MM-DD-YYYY
        const [year, month, day] = dateString.split('-');
        return `${month}-${day}-${year}`;
    }
}