class ProjectGanttApp {
    constructor() {
        // Initialize services
        this.asanaService = new AsanaService();
        this.airtableService = new AirtableService();
        this.githubService = new GitHubService();
        this.azureDevOpsService = new AzureDevOpsService();
        this.jiraService = new JiraService();
        this.fieldMappingService = new FieldMappingService();
        
        // Current state
        this.currentDataSource = null;
        this.ganttInstance = null;
        
        // DOM elements
        this.initDOMElements();
        
        // Initialize
        this.initEventListeners();
    }
    
    initDOMElements() {
        // Data source selection
        this.dataSourceSelect = document.getElementById('data-source-select');
        
        // Asana elements
        this.asanaGroup = document.getElementById('asana-group');
        this.asanaPatInput = document.getElementById('asana-pat-input');
        this.asanaConnectBtn = document.getElementById('asana-connect-btn');
        
        // Airtable elements
        this.airtableGroup = document.getElementById('airtable-group');
        this.airtableApiKeyInput = document.getElementById('airtable-api-key-input');
        this.airtableBaseIdInput = document.getElementById('airtable-base-id-input');
        this.airtableTableNameInput = document.getElementById('airtable-table-name-input');
        this.airtableConnectBtn = document.getElementById('airtable-connect-btn');
        
        // GitHub elements
        this.githubGroup = document.getElementById('github-group');
        this.githubTokenInput = document.getElementById('github-token-input');
        this.githubOwnerInput = document.getElementById('github-owner-input');
        this.githubRepoInput = document.getElementById('github-repo-input');
        this.githubConnectBtn = document.getElementById('github-connect-btn');
        
        // Azure DevOps elements
        this.azureDevOpsGroup = document.getElementById('azure-devops-group');
        this.azureDevOpsTokenInput = document.getElementById('azure-devops-token-input');
        this.azureDevOpsOrgInput = document.getElementById('azure-devops-org-input');
        this.azureDevOpsProjectInput = document.getElementById('azure-devops-project-input');
        this.azureDevOpsConnectBtn = document.getElementById('azure-devops-connect-btn');
        
        // Jira elements
        this.jiraGroup = document.getElementById('jira-group');
        this.jiraUrlInput = document.getElementById('jira-url-input');
        this.jiraEmailInput = document.getElementById('jira-email-input');
        this.jiraTokenInput = document.getElementById('jira-token-input');
        this.jiraTypeSelect = document.getElementById('jira-type-select');
        this.jiraConnectBtn = document.getElementById('jira-connect-btn');
        
        // Common elements
        this.projectGroup = document.getElementById('project-group');
        this.projectSelect = document.getElementById('project-select');
        this.projectSelectLabel = document.getElementById('project-select-label');
        this.loadingDiv = document.getElementById('loading');
        this.errorDiv = document.getElementById('error-message');
        this.ganttContainer = document.getElementById('gantt-container');
        
        // Mapping dialog elements
        this.openMappingBtn = document.getElementById('open-mapping-btn');
        this.mappingDialog = document.getElementById('mapping-dialog');
        this.closeMappingBtn = document.getElementById('close-mapping-btn');
        this.saveMappingBtn = document.getElementById('save-mapping-btn');
        this.resetMappingBtn = document.getElementById('reset-mapping-btn');
        this.mappingRowsContainer = document.getElementById('mapping-rows');
    }
    
    initEventListeners() {
        // Data source selection
        this.dataSourceSelect.addEventListener('change', (e) => this.handleDataSourceChange(e.target.value));
        
        // Asana connection
        this.asanaConnectBtn.addEventListener('click', () => this.handleAsanaConnect());
        this.asanaPatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleAsanaConnect();
        });
        
        // Airtable connection
        this.airtableConnectBtn.addEventListener('click', () => this.handleAirtableConnect());
        this.airtableTableNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleAirtableConnect();
        });
        
        // GitHub connection
        this.githubConnectBtn.addEventListener('click', () => this.handleGitHubConnect());
        this.githubRepoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleGitHubConnect();
        });
        
        // Azure DevOps connection
        this.azureDevOpsConnectBtn.addEventListener('click', () => this.handleAzureDevOpsConnect());
        this.azureDevOpsProjectInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleAzureDevOpsConnect();
        });
        
        // Jira connection
        this.jiraConnectBtn.addEventListener('click', () => this.handleJiraConnect());
        this.jiraTokenInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleJiraConnect();
        });
        
        // Project/table selection
        this.projectSelect.addEventListener('change', (e) => this.handleProjectChange(e.target.value));
        
        // Mapping dialog events
        this.openMappingBtn.addEventListener('click', () => this.openMappingDialog());
        this.closeMappingBtn.addEventListener('click', () => this.closeMappingDialog());
        this.saveMappingBtn.addEventListener('click', () => this.saveFieldMappings());
        this.resetMappingBtn.addEventListener('click', () => this.resetFieldMappings());
        
        // Close dialog when clicking outside
        this.mappingDialog.addEventListener('click', (e) => {
            if (e.target === this.mappingDialog) {
                this.closeMappingDialog();
            }
        });
    }
    
    handleDataSourceChange(dataSource) {
        // Hide all connection groups
        this.asanaGroup.style.display = 'none';
        this.airtableGroup.style.display = 'none';
        this.githubGroup.style.display = 'none';
        this.azureDevOpsGroup.style.display = 'none';
        this.jiraGroup.style.display = 'none';
        this.projectGroup.style.display = 'none';
        
        // Clear current state
        this.currentDataSource = null;
        this.clearGantt();
        this.hideError();
        
        if (dataSource === 'asana') {
            this.asanaGroup.style.display = 'block';
            this.currentDataSource = 'asana';
            this.projectSelectLabel.textContent = 'Select Project:';
        } else if (dataSource === 'airtable') {
            this.airtableGroup.style.display = 'block';
            this.currentDataSource = 'airtable';
            this.projectSelectLabel.textContent = 'Table Data:';
        } else if (dataSource === 'github') {
            this.githubGroup.style.display = 'block';
            this.currentDataSource = 'github';
            this.projectSelectLabel.textContent = 'Select Project:';
        } else if (dataSource === 'azure-devops') {
            this.azureDevOpsGroup.style.display = 'block';
            this.currentDataSource = 'azure-devops';
            this.projectSelectLabel.textContent = 'Work Items:';
        } else if (dataSource === 'jira') {
            this.jiraGroup.style.display = 'block';
            this.currentDataSource = 'jira';
            this.projectSelectLabel.textContent = 'Select Project:';
        }
    }
    
    async handleAsanaConnect() {
        const pat = this.asanaPatInput.value.trim();
        
        if (!pat) {
            this.showError('Please enter your Asana PAT');
            return;
        }
        
        this.hideError();
        this.showLoading();
        
        try {
            this.asanaService.setPAT(pat);
            await this.asanaService.connect();
            
            // Load projects
            const projects = await this.asanaService.getProjects();
            this.populateProjectSelect(projects, 'asana');
            
            // Show project selector
            this.showConnectedState('asana');
            
        } catch (error) {
            console.error('Asana connection error:', error);
            this.showError(`Failed to connect to Asana: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }
    
    async handleAirtableConnect() {
        const apiKey = this.airtableApiKeyInput.value.trim();
        const baseId = this.airtableBaseIdInput.value.trim();
        const tableName = this.airtableTableNameInput.value.trim();
        
        if (!apiKey || !baseId || !tableName) {
            this.showError('Please enter API key, Base ID, and table name');
            return;
        }
        
        this.hideError();
        this.showLoading();
        
        try {
            this.airtableService.setCredentials(apiKey, baseId);
            await this.airtableService.testConnection(tableName);
            
            // For Airtable, we directly load the table data instead of listing tables
            this.populateProjectSelect([{ name: tableName, id: tableName }], 'airtable');
            
            // Show project selector
            this.showConnectedState('airtable');
            
        } catch (error) {
            console.error('Airtable connection error:', error);
            this.showError(`Failed to connect to Airtable: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }
    
    async handleGitHubConnect() {
        const token = this.githubTokenInput.value.trim();
        const owner = this.githubOwnerInput.value.trim();
        const repo = this.githubRepoInput.value.trim();
        
        if (!token || !owner || !repo) {
            this.showError('Please enter GitHub token, owner, and repository name');
            return;
        }
        
        this.hideError();
        this.showLoading();
        
        try {
            this.githubService.setCredentials(token, owner, repo);
            await this.githubService.testConnection();
            
            // Load GitHub projects
            const projects = await this.githubService.getProjects();
            this.populateProjectSelect(projects, 'github');
            
            // Show project selector
            this.showConnectedState('github');
            
        } catch (error) {
            console.error('GitHub connection error:', error);
            this.showError(`Failed to connect to GitHub: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }
    
    async handleAzureDevOpsConnect() {
        const token = this.azureDevOpsTokenInput.value.trim();
        const organization = this.azureDevOpsOrgInput.value.trim();
        const project = this.azureDevOpsProjectInput.value.trim();
        
        if (!token || !organization || !project) {
            this.showError('Please enter Azure DevOps token, organization, and project name');
            return;
        }
        
        this.hideError();
        this.showLoading();
        
        try {
            this.azureDevOpsService.setCredentials(token, organization, project);
            await this.azureDevOpsService.testConnection();
            
            // For Azure DevOps, we use predefined work item queries
            const queryOptions = this.azureDevOpsService.getCommonQueryOptions();
            const queries = Object.keys(queryOptions).map(key => ({
                name: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
                id: key
            }));
            
            this.populateProjectSelect(queries, 'azure-devops');
            
            // Show project selector
            this.showConnectedState('azure-devops');
            
        } catch (error) {
            console.error('Azure DevOps connection error:', error);
            this.showError(`Failed to connect to Azure DevOps: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }
    
    async handleJiraConnect() {
        const baseUrl = this.jiraUrlInput.value.trim();
        const email = this.jiraEmailInput.value.trim();
        const token = this.jiraTokenInput.value.trim();
        const isCloud = this.jiraTypeSelect.value === 'cloud';
        
        if (!baseUrl || !email || !token) {
            this.showError('Please enter Jira URL, email/username, and API token/password');
            return;
        }
        
        this.hideError();
        this.showLoading();
        
        try {
            this.jiraService.setCredentials(baseUrl, email, token, isCloud);
            await this.jiraService.testConnection();
            
            // Load Jira projects
            const projects = await this.jiraService.getProjects();
            this.populateProjectSelect(projects, 'jira');
            
            // Show project selector
            this.showConnectedState('jira');
            
        } catch (error) {
            console.error('Jira connection error:', error);
            this.showError(`Failed to connect to Jira: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }
    
    populateProjectSelect(items, dataSource) {
        // Clear existing options
        let defaultText = '-- Select project --';
        if (dataSource === 'airtable') defaultText = '-- Select table --';
        if (dataSource === 'azure-devops') defaultText = '-- Select query --';
        
        this.projectSelect.innerHTML = `<option value="">${defaultText}</option>`;
        
        // Add items to select
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item.gid || item.id || item.key;
            option.textContent = item.name || item.title;
            this.projectSelect.appendChild(option);
        });
    }
    
    showConnectedState(dataSource) {
        this.projectGroup.style.display = 'block';
        this.projectSelect.disabled = false;
        
        if (dataSource === 'asana') {
            this.asanaConnectBtn.textContent = 'Connected ✓';
            this.asanaConnectBtn.disabled = true;
            this.asanaPatInput.disabled = true;
        } else if (dataSource === 'airtable') {
            this.airtableConnectBtn.textContent = 'Connected ✓';
            this.airtableConnectBtn.disabled = true;
            this.airtableApiKeyInput.disabled = true;
            this.airtableBaseIdInput.disabled = true;
            this.airtableTableNameInput.disabled = true;
        } else if (dataSource === 'github') {
            this.githubConnectBtn.textContent = 'Connected ✓';
            this.githubConnectBtn.disabled = true;
            this.githubTokenInput.disabled = true;
            this.githubOwnerInput.disabled = true;
            this.githubRepoInput.disabled = true;
        } else if (dataSource === 'azure-devops') {
            this.azureDevOpsConnectBtn.textContent = 'Connected ✓';
            this.azureDevOpsConnectBtn.disabled = true;
            this.azureDevOpsTokenInput.disabled = true;
            this.azureDevOpsOrgInput.disabled = true;
            this.azureDevOpsProjectInput.disabled = true;
        } else if (dataSource === 'jira') {
            this.jiraConnectBtn.textContent = 'Connected ✓';
            this.jiraConnectBtn.disabled = true;
            this.jiraUrlInput.disabled = true;
            this.jiraEmailInput.disabled = true;
            this.jiraTokenInput.disabled = true;
            this.jiraTypeSelect.disabled = true;
        }
    }
    
    async handleProjectChange(projectId) {
        if (!projectId) {
            this.clearGantt();
            return;
        }
        
        this.hideError();
        this.showLoading();
        
        try {
            let ganttData = [];
            
            if (this.currentDataSource === 'asana') {
                ganttData = await this.loadAsanaProjectData(projectId);
            } else if (this.currentDataSource === 'airtable') {
                ganttData = await this.loadAirtableData(projectId);
            } else if (this.currentDataSource === 'github') {
                ganttData = await this.loadGitHubProjectData(projectId);
            } else if (this.currentDataSource === 'azure-devops') {
                ganttData = await this.loadAzureDevOpsData(projectId);
            } else if (this.currentDataSource === 'jira') {
                ganttData = await this.loadJiraProjectData(projectId);
            }
            
            if (ganttData.length === 0) {
                this.showError('No items with dates found');
                this.clearGantt();
                return;
            }
            
            // Render Gantt chart
            this.renderGantt(ganttData);
            
        } catch (error) {
            console.error('Error loading data:', error);
            this.showError(`Failed to load data: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }
    
    async loadAsanaProjectData(projectGid) {
        try {
            const projectData = await this.asanaService.getProjectData(projectGid);
            const fieldMappings = this.fieldMappingService.loadFieldMappings('asana');
            
            return this.asanaService.convertToGanttFormat(projectData.tasks, fieldMappings);
        } catch (error) {
            throw new Error(`Failed to load Asana project data: ${error.message}`);
        }
    }
    
    async loadAirtableData(tableName) {
        try {
            const records = await this.airtableService.getTableRecords(tableName);
            const fieldMappings = this.fieldMappingService.loadFieldMappings('airtable');
            
            return this.airtableService.convertToGanttFormat(records, fieldMappings);
        } catch (error) {
            throw new Error(`Failed to load Airtable data: ${error.message}`);
        }
    }
    
    async loadGitHubProjectData(projectId) {
        try {
            const projectData = await this.githubService.getProjectData(projectId);
            const fieldMappings = this.fieldMappingService.loadFieldMappings('github');
            
            return this.githubService.convertToGanttFormat(projectData.items, fieldMappings);
        } catch (error) {
            throw new Error(`Failed to load GitHub project data: ${error.message}`);
        }
    }
    
    async loadAzureDevOpsData(queryType) {
        try {
            const queryOptions = this.azureDevOpsService.getCommonQueryOptions();
            const options = queryOptions[queryType] || {};
            
            const projectData = await this.azureDevOpsService.getProjectData(options);
            const fieldMappings = this.fieldMappingService.loadFieldMappings('azure-devops');
            
            return this.azureDevOpsService.convertToGanttFormat(projectData.workItems, fieldMappings);
        } catch (error) {
            throw new Error(`Failed to load Azure DevOps data: ${error.message}`);
        }
    }
    
    async loadJiraProjectData(projectKey) {
        try {
            const projectData = await this.jiraService.getProjectData(projectKey);
            const fieldMappings = this.fieldMappingService.loadFieldMappings('jira');
            
            return this.jiraService.convertToGanttFormat(projectData.issues, fieldMappings);
        } catch (error) {
            throw new Error(`Failed to load Jira project data: ${error.message}`);
        }
    }
    
    openMappingDialog() {
        if (!this.currentDataSource) {
            this.showError('Please connect to a data source first');
            return;
        }
        
        this.renderMappingDialog();
        this.mappingDialog.style.display = 'flex';
    }
    
    closeMappingDialog() {
        this.mappingDialog.style.display = 'none';
    }
    
    async renderMappingDialog() {
        this.mappingRowsContainer.innerHTML = '';
        
        let sourceFields = [];
        
        // Get source fields based on current data source
        if (this.currentDataSource === 'asana') {
            sourceFields = this.asanaService.getAsanaFields();
        } else if (this.currentDataSource === 'airtable') {
            // Try to get actual table schema
            const tableName = this.airtableTableNameInput.value.trim();
            if (tableName) {
                try {
                    sourceFields = await this.airtableService.getTableSchema(tableName);
                } catch (error) {
                    console.warn('Could not load table schema, using defaults:', error);
                    sourceFields = this.airtableService.getAirtableFields();
                }
            } else {
                sourceFields = this.airtableService.getAirtableFields();
            }
        } else if (this.currentDataSource === 'github') {
            sourceFields = this.githubService.getGitHubFields();
        } else if (this.currentDataSource === 'azure-devops') {
            sourceFields = this.azureDevOpsService.getAzureDevOpsFields();
        } else if (this.currentDataSource === 'jira') {
            try {
                sourceFields = await this.jiraService.getEnhancedFields();
            } catch (error) {
                console.warn('Could not load enhanced Jira fields, using defaults:', error);
                sourceFields = this.jiraService.getJiraFields();
            }
        }
        
        const mappingConfig = this.fieldMappingService.createMappingConfig(sourceFields, this.currentDataSource);
        
        mappingConfig.ganttFields.forEach(ganttField => {
            const row = document.createElement('div');
            row.className = 'mapping-row';
            
            // Gantt field info (left side)
            const ganttInfo = document.createElement('div');
            ganttInfo.className = 'field-info';
            ganttInfo.innerHTML = `
                <div class="field-label">
                    ${ganttField.key}
                    ${ganttField.required ? '<span style="color: #e74c3c;">*</span>' : ''}
                </div>
                <div class="field-type">${ganttField.type}</div>
                <div class="field-description">${ganttField.description}</div>
            `;
            
            // Arrow
            const arrow = document.createElement('div');
            arrow.className = 'mapping-arrow';
            arrow.innerHTML = '←';
            
            // Source field selector (right side)
            const sourceSelector = document.createElement('div');
            sourceSelector.className = 'field-info';
            
            const select = document.createElement('select');
            select.className = 'field-select';
            select.dataset.ganttField = ganttField.key;
            
            // Add empty option
            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = `-- Select ${this.currentDataSource} field --`;
            select.appendChild(emptyOption);
            
            // Add source fields as options
            sourceFields.forEach(sourceField => {
                const option = document.createElement('option');
                option.value = sourceField.key;
                option.textContent = `${sourceField.key} (${sourceField.type})`;
                
                // Set selected if this is the current mapping
                if (mappingConfig.currentMappings[ganttField.key] === sourceField.key) {
                    option.selected = true;
                }
                
                select.appendChild(option);
            });
            
            // Show selected field description
            const selectedDescription = document.createElement('div');
            selectedDescription.className = 'field-description';
            selectedDescription.style.marginTop = '8px';
            
            const updateDescription = () => {
                const selectedField = sourceFields.find(f => f.key === select.value);
                selectedDescription.textContent = selectedField ? selectedField.description : '';
            };
            
            select.addEventListener('change', updateDescription);
            updateDescription();
            
            sourceSelector.appendChild(select);
            sourceSelector.appendChild(selectedDescription);
            
            row.appendChild(ganttInfo);
            row.appendChild(arrow);
            row.appendChild(sourceSelector);
            
            this.mappingRowsContainer.appendChild(row);
        });
    }
    
    saveFieldMappings() {
        const selects = this.mappingRowsContainer.querySelectorAll('.field-select');
        const formData = {};
        
        selects.forEach(select => {
            const ganttField = select.dataset.ganttField;
            const sourceField = select.value;
            if (sourceField) {
                formData[ganttField] = sourceField;
            }
        });
        
        const result = this.fieldMappingService.updateMappingsFromForm(formData, this.currentDataSource);
        
        if (result.saved) {
            this.closeMappingDialog();
            this.showSuccess('Field mappings saved successfully! Changes will apply to newly loaded data.');
        } else {
            this.showError(`Mapping validation failed: ${result.validation.errors.join(', ')}`);
        }
    }
    
    resetFieldMappings() {
        if (confirm('Are you sure you want to reset all field mappings to defaults?')) {
            this.fieldMappingService.resetFieldMappings(this.currentDataSource);
            this.renderMappingDialog();
            this.showSuccess('Field mappings reset to defaults!');
        }
    }
    
    showLoading(show = true) {
        this.loadingDiv.style.display = show ? 'flex' : 'none';
    }
    
    showError(message) {
        this.errorDiv.textContent = message;
        this.errorDiv.style.display = 'block';
        this.errorDiv.style.background = '#fee';
        this.errorDiv.style.border = '2px solid #fcc';
        this.errorDiv.style.color = '#c33';
        setTimeout(() => {
            this.errorDiv.style.display = 'none';
        }, 5000);
    }
    
    showSuccess(message) {
        this.errorDiv.textContent = message;
        this.errorDiv.style.display = 'block';
        this.errorDiv.style.background = '#efe';
        this.errorDiv.style.border = '2px solid #cfc';
        this.errorDiv.style.color = '#3c3';
        setTimeout(() => {
            this.errorDiv.style.display = 'none';
        }, 3000);
    }
    
    hideError() {
        this.errorDiv.style.display = 'none';
    }
    
    renderGantt(data) {
        this.clearGantt();
        
        const ganttOptions = {
            series: data,
            chart: {
                height: Math.max(400, data.length * 50)
            },
            plotOptions: {
                bar: {
                    horizontal: true,
                    barHeight: '60%'
                }
            },
            xaxis: {
                type: 'datetime'
            }
        };
        
        this.ganttInstance = new ApexGantt(this.ganttContainer, ganttOptions);
        this.ganttInstance.render();
        this.ganttContainer.style.display = 'block';
    }
    
    clearGantt() {
        if (this.ganttInstance) {
            this.ganttInstance.destroy();
            this.ganttInstance = null;
        }
        this.ganttContainer.innerHTML = '';
        this.ganttContainer.style.display = 'none';
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ProjectGanttApp();
});