class FieldMappingService {
    constructor() {
        // Define Gantt chart expected fields
        this.ganttFields = [
            { key: 'id', type: 'string', required: true, description: 'Unique identifier for the task' },
            { key: 'name', type: 'string', required: true, description: 'Display name of the task' },
            { key: 'startTime', type: 'date', required: true, description: 'Start date/time of the task' },
            { key: 'endTime', type: 'date', required: true, description: 'End date/time of the task' },
            { key: 'progress', type: 'number', required: false, description: 'Task completion progress (0-100)' },
            { key: 'parentId', type: 'string', required: false, description: 'ID of the parent task' },
            { key: 'dependency', type: 'string', required: false, description: 'ID of the task this task depends on' },
            { key: 'type', type: 'string', required: false, description: 'Type of item: task or milestone' }
        ];
        
        // Default mappings for different data sources
        this.defaultMappings = {
            asana: {
                'id': 'gid',
                'name': 'name',
                'startTime': 'start_on',
                'endTime': 'due_on',
                'progress': 'completed_percentage',
                'parentId': 'dependencies[0].gid',
                'dependency': 'dependencies[0].gid',
                'type': 'type' // Will be determined based on due_on presence
            },
            airtable: {
                'id': 'id',
                'name': 'Name',
                'startTime': 'Start Date',
                'endTime': 'End Date',
                'progress': 'Progress',
                'parentId': 'Parent Task',
                'dependency': 'Dependency',
                'type': 'Type'
            },
            github: {
                'id': 'id',
                'name': 'title',
                'startTime': 'startDate',
                'endTime': 'targetDate',
                'progress': 'progress',
                'parentId': 'parent',
                'dependency': 'dependency',
                'type': 'type'
            },
            'azure-devops': {
                'id': 'id',
                'name': 'fields["System.Title"]',
                'startTime': 'fields["Microsoft.VSTS.Scheduling.StartDate"]',
                'endTime': 'fields["Microsoft.VSTS.Scheduling.TargetDate"]',
                'progress': 'progress',
                'parentId': 'fields["System.Parent"]',
                'dependency': 'dependency',
                'type': 'type'
            },
            jira: {
                'id': 'key',
                'name': 'fields.summary',
                'startTime': 'fields.customfield_10002',
                'endTime': 'fields.duedate',
                'progress': 'fields.progress.percent',
                'parentId': 'fields.parent.key',
                'dependency': 'dependency',
                'type': 'type'
            }
        };
        
        this.currentMappings = {};
        this.currentDataSource = null;
    }
    
    /**
     * Get Gantt field definitions
     * @returns {Array} Array of Gantt field definitions
     */
    getGanttFields() {
        return this.ganttFields;
    }
    
    /**
     * Get default mappings for a data source
     * @param {string} dataSource - Data source name ('asana' or 'airtable')
     * @returns {Object} Default field mappings
     */
    getDefaultMappings(dataSource) {
        return { ...this.defaultMappings[dataSource] } || {};
    }
    
    /**
     * Load field mappings from localStorage
     * @param {string} dataSource - Data source name
     * @returns {Object} Loaded field mappings
     */
    loadFieldMappings(dataSource) {
        const storageKey = `${dataSource}GanttFieldMappings`;
        const saved = localStorage.getItem(storageKey);
        
        if (saved) {
            try {
                this.currentMappings = JSON.parse(saved);
                this.currentDataSource = dataSource;
                return this.currentMappings;
            } catch (e) {
                console.warn('Failed to load saved mappings, using defaults');
            }
        }
        
        // Use defaults if no saved mappings or loading failed
        this.currentMappings = this.getDefaultMappings(dataSource);
        this.currentDataSource = dataSource;
        return this.currentMappings;
    }
    
    /**
     * Save field mappings to localStorage
     * @param {Object} mappings - Field mappings to save
     * @param {string} dataSource - Data source name
     */
    saveFieldMappings(mappings, dataSource) {
        const storageKey = `${dataSource}GanttFieldMappings`;
        this.currentMappings = { ...mappings };
        this.currentDataSource = dataSource;
        
        localStorage.setItem(storageKey, JSON.stringify(mappings));
    }
    
    /**
     * Reset field mappings to defaults
     * @param {string} dataSource - Data source name
     * @returns {Object} Default field mappings
     */
    resetFieldMappings(dataSource) {
        const storageKey = `${dataSource}GanttFieldMappings`;
        localStorage.removeItem(storageKey);
        
        this.currentMappings = this.getDefaultMappings(dataSource);
        this.currentDataSource = dataSource;
        
        return this.currentMappings;
    }
    
    /**
     * Get current field mappings
     * @returns {Object} Current field mappings
     */
    getCurrentMappings() {
        return { ...this.currentMappings };
    }
    
    /**
     * Get current data source
     * @returns {string} Current data source name
     */
    getCurrentDataSource() {
        return this.currentDataSource;
    }
    
    /**
     * Validate field mappings
     * @param {Object} mappings - Field mappings to validate
     * @returns {Object} Validation result with isValid boolean and errors array
     */
    validateMappings(mappings) {
        const errors = [];
        const requiredFields = this.ganttFields.filter(field => field.required);
        
        // Check if all required fields are mapped
        requiredFields.forEach(field => {
            if (!mappings[field.key] || mappings[field.key].trim() === '') {
                errors.push(`Required field '${field.key}' is not mapped`);
            }
        });
        
        // Check for duplicate mappings (same source field mapped to multiple gantt fields)
        const sourceFields = Object.values(mappings).filter(value => value && value.trim() !== '');
        const uniqueSourceFields = [...new Set(sourceFields)];
        
        if (sourceFields.length !== uniqueSourceFields.length) {
            errors.push('Some source fields are mapped to multiple Gantt fields');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    /**
     * Create mapping configuration for UI rendering
     * @param {Array} sourceFields - Available source fields
     * @param {string} dataSource - Data source name
     * @returns {Object} Configuration object for UI
     */
    createMappingConfig(sourceFields, dataSource) {
        const mappings = this.loadFieldMappings(dataSource);
        
        return {
            ganttFields: this.ganttFields,
            sourceFields: sourceFields,
            currentMappings: mappings,
            dataSource: dataSource,
            validation: this.validateMappings(mappings)
        };
    }
    
    /**
     * Update mappings from UI form data
     * @param {Object} formData - Form data from UI
     * @param {string} dataSource - Data source name
     * @returns {Object} Updated mappings and validation result
     */
    updateMappingsFromForm(formData, dataSource) {
        const newMappings = {};
        
        // Extract mappings from form data
        Object.keys(formData).forEach(ganttField => {
            const sourceField = formData[ganttField];
            if (sourceField && sourceField.trim() !== '') {
                newMappings[ganttField] = sourceField.trim();
            }
        });
        
        // Validate the new mappings
        const validation = this.validateMappings(newMappings);
        
        if (validation.isValid) {
            this.saveFieldMappings(newMappings, dataSource);
        }
        
        return {
            mappings: newMappings,
            validation: validation,
            saved: validation.isValid
        };
    }
    
    /**
     * Generate mapping suggestions based on field name similarity
     * @param {Array} sourceFields - Available source fields
     * @param {string} dataSource - Data source name
     * @returns {Object} Suggested mappings
     */
    generateMappingSuggestions(sourceFields, dataSource) {
        const suggestions = {};
        const defaults = this.getDefaultMappings(dataSource);
        
        this.ganttFields.forEach(ganttField => {
            // First try default mapping
            if (defaults[ganttField.key]) {
                const defaultField = defaults[ganttField.key];
                const exactMatch = sourceFields.find(sf => sf.key === defaultField);
                if (exactMatch) {
                    suggestions[ganttField.key] = defaultField;
                    return;
                }
            }
            
            // If no exact default match, try fuzzy matching
            const ganttKey = ganttField.key.toLowerCase();
            let bestMatch = null;
            let bestScore = 0;
            
            sourceFields.forEach(sourceField => {
                const sourceKey = sourceField.key.toLowerCase();
                let score = 0;
                
                // Exact match gets highest score
                if (sourceKey === ganttKey) {
                    score = 100;
                } else if (sourceKey.includes(ganttKey) || ganttKey.includes(sourceKey)) {
                    score = 80;
                } else {
                    // Check for common patterns
                    const patterns = {
                        'id': ['gid', 'identifier', 'key', 'number'],
                        'name': ['title', 'task', 'subject', 'summary'],
                        'starttime': ['start', 'begin', 'from', 'created'],
                        'endtime': ['end', 'due', 'finish', 'to', 'target', 'close'],
                        'progress': ['complete', 'percent', '%', 'done'],
                        'parentid': ['parent', 'super', 'epic'],
                        'dependency': ['depend', 'prerequisite', 'requires', 'blocks'],
                        'type': ['type', 'kind', 'category', 'itemtype']
                    };
                    
                    const ganttPatterns = patterns[ganttKey] || [];
                    ganttPatterns.forEach(pattern => {
                        if (sourceKey.includes(pattern)) {
                            score = Math.max(score, 60);
                        }
                    });
                }
                
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = sourceField.key;
                }
            });
            
            if (bestMatch && bestScore >= 60) {
                suggestions[ganttField.key] = bestMatch;
            }
        });
        
        return suggestions;
    }
}