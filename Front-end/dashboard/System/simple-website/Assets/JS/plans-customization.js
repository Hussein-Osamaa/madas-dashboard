// Plans Customization functionality
document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const plansContainer = document.getElementById('plansContainer');
    const featuresMatrix = document.getElementById('featuresMatrix');
    const planPreview = document.getElementById('planPreview');
    const addPlanBtn = document.getElementById('addPlanBtn');
    const savePlansBtn = document.getElementById('savePlansBtn');

    // Available features
    const availableFeatures = [
        'Website Builder',
        'Basic Analytics',
        'Email Support',
        '5GB Storage',
        'Custom Domain',
        'Advanced Analytics',
        'Priority Support',
        'API Access',
        'White Label',
        'Custom Integrations',
        'SSL Certificate',
        'CDN',
        'Backup & Restore',
        'Multi-language Support',
        'E-commerce Integration',
        'SEO Tools',
        'A/B Testing',
        'Custom Branding',
        'Advanced Security',
        '24/7 Phone Support'
    ];

    // Default plans configuration
    let plansConfig = JSON.parse(localStorage.getItem('nextgen_plans_config') || JSON.stringify({
        starter: {
            name: 'Starter',
            price: 29,
            description: 'Perfect for small businesses',
            features: {
                'Website Builder': true,
                'Basic Analytics': true,
                'Email Support': true,
                '5GB Storage': true,
                'SSL Certificate': true
            }
        },
        professional: {
            name: 'Professional',
            price: 79,
            description: 'Ideal for growing companies',
            features: {
                'Website Builder': true,
                'Basic Analytics': true,
                'Email Support': true,
                '5GB Storage': true,
                'Custom Domain': true,
                'Advanced Analytics': true,
                'Priority Support': true,
                'API Access': true,
                'SSL Certificate': true,
                'CDN': true,
                'Backup & Restore': true
            }
        },
        enterprise: {
            name: 'Enterprise',
            price: 199,
            description: 'For large organizations',
            features: {
                'Website Builder': true,
                'Basic Analytics': true,
                'Email Support': true,
                '5GB Storage': true,
                'Custom Domain': true,
                'Advanced Analytics': true,
                'Priority Support': true,
                'API Access': true,
                'White Label': true,
                'Custom Integrations': true,
                'SSL Certificate': true,
                'CDN': true,
                'Backup & Restore': true,
                'Multi-language Support': true,
                'E-commerce Integration': true,
                'SEO Tools': true,
                'A/B Testing': true,
                'Custom Branding': true,
                'Advanced Security': true,
                '24/7 Phone Support': true
            }
        }
    }));

    // Initialize the customization interface
    function initializeCustomization() {
        renderPlans();
        renderFeaturesMatrix();
        renderPlanPreview();
    }

    // Render plans editor
    function renderPlans() {
        plansContainer.innerHTML = '';
        
        Object.keys(plansConfig).forEach(planKey => {
            const plan = plansConfig[planKey];
            const planElement = createPlanElement(planKey, plan);
            plansContainer.appendChild(planElement);
        });
    }

    // Create plan element
    function createPlanElement(planKey, plan) {
        const planDiv = document.createElement('div');
        planDiv.className = 'plan-editor-item';
        planDiv.innerHTML = `
            <div class="plan-header">
                <div class="plan-info">
                    <input type="text" class="plan-name-input" value="${plan.name}" data-plan="${planKey}">
                    <input type="number" class="plan-price-input" value="${plan.price}" data-plan="${planKey}">
                    <input type="text" class="plan-description-input" value="${plan.description}" data-plan="${planKey}">
                </div>
                <div class="plan-actions">
                    <button class="action-btn edit-btn" onclick="editPlan('${planKey}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="deletePlan('${planKey}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="plan-features">
                <h4>Features:</h4>
                <div class="features-grid">
                    ${availableFeatures.map(feature => `
                        <label class="feature-checkbox">
                            <input type="checkbox" 
                                   ${plan.features[feature] ? 'checked' : ''} 
                                   data-plan="${planKey}" 
                                   data-feature="${feature}">
                            <span>${feature}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `;
        
        return planDiv;
    }

    // Render features matrix
    function renderFeaturesMatrix() {
        const matrixHTML = `
            <div class="matrix-header">
                <div class="feature-column">Feature</div>
                ${Object.keys(plansConfig).map(planKey => 
                    `<div class="plan-column">${plansConfig[planKey].name} ($${plansConfig[planKey].price})</div>`
                ).join('')}
            </div>
            ${availableFeatures.map(feature => `
                <div class="matrix-row">
                    <div class="feature-name">${feature}</div>
                    ${Object.keys(plansConfig).map(planKey => `
                        <div class="feature-access">
                            <i class="fas ${plansConfig[planKey].features[feature] ? 'fa-check' : 'fa-times'} ${plansConfig[planKey].features[feature] ? 'access-yes' : 'access-no'}"></i>
                        </div>
                    `).join('')}
                </div>
            `).join('')}
        `;
        
        featuresMatrix.innerHTML = matrixHTML;
    }

    // Render plan preview
    function renderPlanPreview() {
        const previewHTML = `
            <div class="preview-grid">
                ${Object.keys(plansConfig).map(planKey => {
                    const plan = plansConfig[planKey];
                    const features = Object.keys(plan.features).filter(feature => plan.features[feature]);
                    
                    return `
                        <div class="preview-plan">
                            <div class="preview-header">
                                <h3>${plan.name}</h3>
                                <div class="preview-price">$${plan.price}/month</div>
                            </div>
                            <p class="preview-description">${plan.description}</p>
                            <ul class="preview-features">
                                ${features.map(feature => `<li><i class="fas fa-check"></i> ${feature}</li>`).join('')}
                            </ul>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        planPreview.innerHTML = previewHTML;
    }

    // Edit plan
    window.editPlan = function(planKey) {
        const plan = plansConfig[planKey];
        const newName = prompt('Enter new plan name:', plan.name);
        if (newName && newName.trim()) {
            plansConfig[planKey].name = newName.trim();
            savePlansConfig();
            initializeCustomization();
        }
    };

    // Delete plan
    window.deletePlan = function(planKey) {
        if (confirm(`Are you sure you want to delete the ${plansConfig[planKey].name} plan?`)) {
            delete plansConfig[planKey];
            savePlansConfig();
            initializeCustomization();
        }
    };

    // Add new plan
    function addNewPlan() {
        const planName = prompt('Enter plan name:');
        if (planName && planName.trim()) {
            const planKey = planName.toLowerCase().replace(/\s+/g, '_');
            const planPrice = prompt('Enter plan price:', '99');
            const planDescription = prompt('Enter plan description:', 'Custom plan');
            
            if (planPrice && !isNaN(planPrice)) {
                plansConfig[planKey] = {
                    name: planName.trim(),
                    price: parseInt(planPrice),
                    description: planDescription.trim(),
                    features: {}
                };
                
                // Initialize all features as false
                availableFeatures.forEach(feature => {
                    plansConfig[planKey].features[feature] = false;
                });
                
                savePlansConfig();
                initializeCustomization();
            }
        }
    }

    // Save plans configuration
    function savePlansConfig() {
        localStorage.setItem('nextgen_plans_config', JSON.stringify(plansConfig));
        console.log('💾 Plans configuration saved');
    }

    // Event listeners for plan inputs
    function setupEventListeners() {
        // Plan name changes
        document.addEventListener('input', function(e) {
            if (e.target.classList.contains('plan-name-input')) {
                const planKey = e.target.dataset.plan;
                plansConfig[planKey].name = e.target.value;
                savePlansConfig();
                renderFeaturesMatrix();
                renderPlanPreview();
            }
        });

        // Plan price changes
        document.addEventListener('input', function(e) {
            if (e.target.classList.contains('plan-price-input')) {
                const planKey = e.target.dataset.plan;
                plansConfig[planKey].price = parseInt(e.target.value) || 0;
                savePlansConfig();
                renderFeaturesMatrix();
                renderPlanPreview();
            }
        });

        // Plan description changes
        document.addEventListener('input', function(e) {
            if (e.target.classList.contains('plan-description-input')) {
                const planKey = e.target.dataset.plan;
                plansConfig[planKey].description = e.target.value;
                savePlansConfig();
            }
        });

        // Feature checkbox changes
        document.addEventListener('change', function(e) {
            if (e.target.type === 'checkbox' && e.target.dataset.plan && e.target.dataset.feature) {
                const planKey = e.target.dataset.plan;
                const feature = e.target.dataset.feature;
                plansConfig[planKey].features[feature] = e.target.checked;
                savePlansConfig();
                renderFeaturesMatrix();
                renderPlanPreview();
            }
        });
    }

    // Event listeners
    if (addPlanBtn) {
        addPlanBtn.addEventListener('click', addNewPlan);
    }

    if (savePlansBtn) {
        savePlansBtn.addEventListener('click', function() {
            savePlansConfig();
            alert('Plans configuration saved successfully!');
        });
    }

    // Initialize
    initializeCustomization();
    setupEventListeners();

    console.log('🚀 Plans customization loaded successfully!');
    console.log('📋 Plan editor ready');
    console.log('⚙️ Features matrix active');
    console.log('👁️ Plan preview available');
    console.log('💾 Configuration saving enabled');
});
