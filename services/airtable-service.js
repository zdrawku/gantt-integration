class AirtableService {
    constructor() {
        this.apiKey = null;
        this.baseId = null;
        
        // Define common Airtable field types
        this.airtableFields = [
            { key: 'id', type: 'string', description: 'Unique record ID' },
            { key: 'Name', type: 'string', description: 'Primary field (usually text)' },
            { key: 'Start Date', type: 'date', description: 'Date field for start time' },
            { key: 'End Date', type: 'date', description: 'Date field for end time' },
            { key: 'Due Date', type: 'date', description: 'Date field for due date' },
            { key: 'Status', type: 'select', description: 'Single select field for status' },
            { key: 'Progress', type: 'number', description: 'Number field for percentage completion' },
            { key: 'Assignee', type: 'string', description: 'Text field for assigned person' },
            { key: 'Description', type: 'string', description: 'Long text field for description' },
            { key: 'Priority', type: 'select', description: 'Single select field for priority' },
            { key: 'Parent Task', type: 'string', description: 'Linked record or text field for parent' },
            { key: 'Dependencies', type: 'string', description: 'Text or linked records for dependencies' },
            { key: 'Created Time', type: 'datetime', description: 'Auto-generated creation timestamp' },
            { key: 'Modified Time', type: 'datetime', description: 'Auto-generated modification timestamp' }
        ];
    }
    
    /**
     * Set the API key and base ID for Airtable
     * @param {string} apiKey - Airtable API key
     * @param {string} baseId - Airtable base ID
     */
    setCredentials(apiKey, baseId) {
        this.apiKey = apiKey;
        this.baseId = baseId;
    }
    
    /**
     * Get available Airtable field definitions
     * @returns {Array} Array of Airtable field definitions
     */
    getAirtableFields() {
        return this.airtableFields;
    }
    
    /**
     * Make a request to the Airtable API
     * @param {string} endpoint - API endpoint (table name)
     * @param {Object} params - Query parameters
     * @param {string} method - HTTP method (GET, POST, PATCH, DELETE)
     * @param {Object} body - Request body for POST/PATCH requests
     * @returns {Promise} API response data
     */
    async makeAirtableRequest(endpoint, params = {}, method = 'GET', body = null) {
        if (!this.apiKey || !this.baseId) {
            throw new Error('Credentials not set. Call setCredentials() first.');
        }
        
        const url = new URL(`https://api.airtable.com/v0/${this.baseId}/${endpoint}`);
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
        
        const options = {
            method,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        };
        
        if (body && (method === 'POST' || method === 'PATCH')) {
            options.body = JSON.stringify(body);
        }
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `Airtable API Error: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    }
    
    /**
     * Test connection to Airtable
     * @param {string} tableName - Name of a table to test with
     * @returns {Promise<boolean>} True if connection successful
     */
    async testConnection(tableName = '') {
        if (!this.apiKey || !this.baseId) {
            throw new Error('Credentials not set. Call setCredentials() first.');
        }
        
        try {
            // Try to get base schema or records from a table
            if (tableName) {
                await this.makeAirtableRequest(tableName, { maxRecords: 1 });
            } else {
                // If no table name provided, just test with a basic request
                await this.makeAirtableRequest('', { maxRecords: 1 });
            }
            return true;
        } catch (error) {
            throw new Error(`Failed to connect to Airtable: ${error.message}`);
        }
    }
    
    /**
     * Get all records from a specific table
     * @param {string} tableName - Name of the Airtable table
     * @param {Object} options - Query options (fields, view, filterByFormula, etc.)
     * @returns {Promise<Array>} Array of records
     */
    async getTableRecords(tableName, options = {}) {
        try {
            const params = {};
            
            // Add supported query parameters
            if (options.fields) params.fields = options.fields;
            if (options.view) params.view = options.view;
            if (options.filterByFormula) params.filterByFormula = options.filterByFormula;
            if (options.sort) params.sort = options.sort;
            if (options.maxRecords) params.maxRecords = options.maxRecords;
            
            let allRecords = [];
            let offset = null;
            
            do {
                if (offset) params.offset = offset;
                
                const response = await this.makeAirtableRequest(tableName, params);
                allRecords = allRecords.concat(response.records || []);
                offset = response.offset;
                
            } while (offset);
            
            return allRecords;
        } catch (error) {
            throw new Error(`Failed to get records from table '${tableName}': ${error.message}`);
        }
    }
    
    /**
     * Get a specific record by ID
     * @param {string} tableName - Name of the Airtable table
     * @param {string} recordId - Record ID
     * @returns {Promise<Object>} Record object
     */
    async getRecord(tableName, recordId) {
        try {
            const response = await this.makeAirtableRequest(`${tableName}/${recordId}`);
            return response;
        } catch (error) {
            throw new Error(`Failed to get record ${recordId} from table '${tableName}': ${error.message}`);
        }
    }
    
    /**
     * Create new records in a table
     * @param {string} tableName - Name of the Airtable table
     * @param {Array} records - Array of record objects with fields
     * @returns {Promise<Array>} Array of created records
     */
    async createRecords(tableName, records) {
        try {
            const body = { records };
            const response = await this.makeAirtableRequest(tableName, {}, 'POST', body);
            return response.records || [];
        } catch (error) {
            throw new Error(`Failed to create records in table '${tableName}': ${error.message}`);
        }
    }
    
    /**
     * Update existing records in a table
     * @param {string} tableName - Name of the Airtable table
     * @param {Array} records - Array of record objects with id and fields
     * @returns {Promise<Array>} Array of updated records
     */
    async updateRecords(tableName, records) {
        try {
            const body = { records };
            const response = await this.makeAirtableRequest(tableName, {}, 'PATCH', body);
            return response.records || [];
        } catch (error) {
            throw new Error(`Failed to update records in table '${tableName}': ${error.message}`);
        }
    }
    
    /**
     * Delete records from a table
     * @param {string} tableName - Name of the Airtable table
     * @param {Array} recordIds - Array of record IDs to delete
     * @returns {Promise<Array>} Array of deleted record info
     */
    async deleteRecords(tableName, recordIds) {
        try {
            const params = { records: recordIds };
            const response = await this.makeAirtableRequest(tableName, params, 'DELETE');
            return response.records || [];
        } catch (error) {
            throw new Error(`Failed to delete records from table '${tableName}': ${error.message}`);
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
     * Convert Airtable records to Gantt format using field mappings
     * @param {Array} records - Array of Airtable records
     * @param {Object} fieldMappings - Mapping configuration
     * @returns {Array} Array of Gantt-formatted tasks
     */
    convertToGanttFormat(records, fieldMappings) {
        const ganttSeries = [];
        
        records.forEach(record => {
            const fields = record.fields || {};
            
            // Get mapped field values
            const idField = fieldMappings['id'] || 'id';
            const nameField = fieldMappings['name'] || 'Name';
            const startField = fieldMappings['startTime'] || 'Start Date';
            const endField = fieldMappings['endTime'] || 'End Date';
            const progressField = fieldMappings['progress'] || 'Progress';
            const parentField = fieldMappings['parentId'] || 'Parent Task';
            
            const taskId = record.id; // Airtable record ID
            const name = this.getNestedValue(fields, nameField) || 'Untitled Task';
            const startValue = this.getNestedValue(fields, startField);
            const endValue = this.getNestedValue(fields, endField);
            const progress = this.getNestedValue(fields, progressField) || 0;
            const parentId = this.getNestedValue(fields, parentField);
            
            // Skip records without dates
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
     * Format date for Gantt chart (convert to MM-DD-YYYY if needed)
     * @param {string} dateString - Date string
     * @returns {string|null} Formatted date string or null
     */
    formatDate(dateString) {
        if (!dateString) return null;
        
        // Handle different date formats from Airtable
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return null;
        
        // Convert to MM-DD-YYYY format
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        
        return `${month}-${day}-${year}`;
    }
    
    /**
     * Get table schema information (field names and types)
     * This is a helper method to understand the structure of a table
     * @param {string} tableName - Name of the Airtable table
     * @returns {Promise<Array>} Array of field information based on sample records
     */
    async getTableSchema(tableName) {
        try {
            // Get a few sample records to understand the schema
            const records = await this.getTableRecords(tableName, { maxRecords: 5 });
            
            if (records.length === 0) {
                return [];
            }
            
            // Extract field names from the first record
            const sampleFields = records[0].fields || {};
            const fieldInfo = [];
            
            Object.keys(sampleFields).forEach(fieldName => {
                const value = sampleFields[fieldName];
                let type = 'string'; // default
                
                // Guess field type based on value
                if (typeof value === 'number') {
                    type = 'number';
                } else if (typeof value === 'boolean') {
                    type = 'boolean';
                } else if (Array.isArray(value)) {
                    type = 'array';
                } else if (value && typeof value === 'string') {
                    // Check if it looks like a date
                    if (value.match(/^\d{4}-\d{2}-\d{2}/) || !isNaN(Date.parse(value))) {
                        type = 'date';
                    }
                }
                
                fieldInfo.push({
                    key: fieldName,
                    type: type,
                    description: `${fieldName} field (${type})`
                });
            });
            
            return fieldInfo;
        } catch (error) {
            throw new Error(`Failed to get schema for table '${tableName}': ${error.message}`);
        }
    }
}