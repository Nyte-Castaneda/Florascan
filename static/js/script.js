// Global variables
let selectedFile = null;

// DOM elements
const photoUploadArea = document.getElementById('photoUploadArea');
const photoInput = document.getElementById('photoInput');
const previewImage = document.getElementById('previewImage');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const plantDescription = document.getElementById('plantDescription');
const askButton = document.getElementById('askButton');
const resultsSection = document.getElementById('resultsSection');
const resultContent = document.getElementById('resultContent');
const plantGrid = document.getElementById('plantGrid');

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
  console.log('FloraScan initialized!');
  
  // Load common plants if on home page
  if (plantGrid) {
    loadCommonPlants();
  }
  
  // Set up event listeners
  setupEventListeners();
});

function setupEventListeners() {
  // Photo upload area click
  if (photoUploadArea) {
    photoUploadArea.addEventListener('click', function() {
      photoInput.click();
    });
  }

  // File input change
  if (photoInput) {
    photoInput.addEventListener('change', handleFileSelect);
  }

  // Ask button click
  if (askButton) {
    askButton.addEventListener('click', handleAskButtonClick);
  }

  // Enter key in description input
  if (plantDescription) {
    plantDescription.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        handleAskButtonClick();
      }
    });
  }
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  
  if (file) {
    selectedFile = file;
    
    // Show preview
    const reader = new FileReader();
    reader.onload = function(e) {
      previewImage.src = e.target.result;
      previewImage.style.display = 'block';
      uploadPlaceholder.style.display = 'none';
    };
    reader.readAsDataURL(file);
    
    console.log('File selected:', file.name);

    // Automatically trigger identification after selecting a file
    if (typeof handleAskButtonClick === 'function') {
      handleAskButtonClick();
    }
  }
}

async function handleAskButtonClick() {
  const description = plantDescription ? plantDescription.value.trim() : '';
  
  if (!selectedFile && !description) {
    alert('Please upload a photo or enter a plant description.');
    return;
  }

  // Disable button and show loading (if button exists)
  if (askButton) {
    askButton.disabled = true;
    askButton.innerHTML = '<span class="loading"></span> Analyzing...';
  }

  try {
    const formData = new FormData();
    
    if (selectedFile) {
      formData.append('image', selectedFile);
    }
    
    if (description) {
      formData.append('description', description);
    }

    const response = await fetch('/api/identify', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to identify plant');
    }

    const data = await response.json();
    displayResults(data);
    
  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred while identifying the plant. Please try again.');
  } finally {
    // Re-enable button
    if (askButton) {
      askButton.disabled = false;
      askButton.innerHTML = 'Ask';
    }
  }
}

function displayResults(data) {
  if (!data.plant) {
    resultContent.innerHTML = '<p>Unable to identify the plant. Please try again with a clearer image or more details.</p>';
    resultsSection.style.display = 'block';
    return;
  }

  const plant = data.plant;
  const confidence = Math.round(data.confidence * 100);
  const lowConfidence = data.low_confidence === true;
  const invalidResult = data.invalid_result === true;
  const alternatives = data.alternatives || [];

  const invalidResultNotice = invalidResult
    ? '<p style="background: #fee2e2; color: #991b1b; padding: 0.75rem 1rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.95rem;"><strong>✕ Invalid result.</strong> Confidence is too low to identify this plant. Try a clearer, closer photo. If different photos always give the same result, the model may need retraining with more and varied images.</p>'
    : '';

  const lowConfidenceNotice = !invalidResult && lowConfidence
    ? '<p style="background: #fef3c7; color: #92400e; padding: 0.5rem 0.75rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.9rem;"><strong>⚠ Low confidence.</strong> The model is uncertain. Result may be wrong — try a clearer, closer photo. If different photos always give the same result, the model may need retraining with more images per plant.</p>'
    : '';

  const alternativesHtml = (lowConfidence || invalidResult) && alternatives.length > 0
    ? `<div style="margin-top: 1rem; padding: 0.75rem; background: #f8fafc; border-radius: 6px;">
        <strong>Other possibilities:</strong>
        <ul style="margin: 0.5rem 0 0 1rem; padding: 0;">
          ${alternatives.slice(0, 5).map(a => `<li>${a.name}: ${Math.round(a.confidence * 100)}%</li>`).join('')}
        </ul>
      </div>`
    : '';

  const html = `
    <div class="result-card">
      <h3>🌿 Identification Results</h3>
      ${invalidResultNotice}
      ${lowConfidenceNotice}
      
      <div style="margin-bottom: 1rem;">
        ${invalidResult ? '<p style="font-size: 0.85rem; color: #6b7280; margin-bottom: 0.25rem;">Best guess (not reliable):</p>' : ''}
        <strong style="font-size: 1.3rem; color: #2d5016;">${plant.common_name}</strong>
        <p style="font-style: italic; color: #718096;">${plant.scientific_name}</p>
        ${plant.family ? `<p style="color: #555;"><strong>Family:</strong> ${plant.family}</p>` : ''}
      </div>

      ${plant.image_url ? `
        <img src="${plant.image_url}" alt="${plant.common_name}" 
             style="max-width: 100%; border-radius: 8px; margin-bottom: 1rem;" />
      ` : ''}

      <div style="margin-bottom: 1rem;">
        <p><strong>Confidence:</strong> ${confidence}%</p>
        <div class="confidence-bar">
          <div class="confidence-fill" style="width: ${confidence}%;"></div>
        </div>
      </div>
      ${alternativesHtml}

      ${plant.description ? `
        <div style="margin-bottom: 1rem;">
          <strong>Description:</strong>
          <p style="color: #555;">${plant.description}</p>
        </div>
      ` : ''}

      ${plant.native_to_philippines ? `
        <p style="background: #e6f7e6; padding: 0.5rem; border-radius: 4px; color: #2d5016;">
          ✓ Native to the Philippines
        </p>
      ` : ''}

      ${plant.care_instructions ? `
        <div style="margin-top: 1rem;">
          <strong>Care Instructions:</strong>
          <p style="color: #555;">${plant.care_instructions}</p>
        </div>
      ` : ''}
    </div>
  `;

  resultContent.innerHTML = html;
  resultsSection.style.display = 'block';
  
  // Scroll to results
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function loadCommonPlants() {
  try {
    const response = await fetch('/api/plants?limit=5');
    const plants = await response.json();
    
    if (plants.length === 0) {
      plantGrid.innerHTML = '<p>No plants available.</p>';
      return;
    }

    plantGrid.innerHTML = plants.slice(0, 5).map(plant => `
      <article class="plant-card" onclick="showPlantDetails(${plant.id})">
        <div class="plant-photo" style="${plant.image_url ? `background-image: url('${plant.image_url}');` : 'background-color: #e0e0e0;'}"></div>
        <div class="plant-info">
          <div class="plant-name">${plant.common_name}</div>
          <div class="plant-scientific">${plant.scientific_name}</div>
        </div>
      </article>
    `).join('');
    
  } catch (error) {
    console.error('Error loading plants:', error);
    plantGrid.innerHTML = '<p>Error loading plants.</p>';
  }
}

function showPlantDetails(plantId) {
  // For now, just log the plant ID
  // You can expand this to show a modal with full plant details
  console.log('Plant clicked:', plantId);
  
  fetch(`/api/plants/${plantId}`)
    .then(response => response.json())
    .then(plant => {
      alert(`${plant.common_name}\n${plant.scientific_name}\n\n${plant.description || 'No description available.'}`);
    })
    .catch(error => {
      console.error('Error fetching plant details:', error);
    });
}

// Stats function (can be used for dashboard)
async function loadStats() {
  try {
    const response = await fetch('/api/stats');
    const stats = await response.json();
    console.log('Application stats:', stats);
    return stats;
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}