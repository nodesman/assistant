<template>
  <div class="wizard-overlay">
    <div class="wizard-container">
      <div class="wizard-header">
        <h2>Welcome to Your Assistant</h2>
        <div class="step-indicator">
          Step {{ currentStep }} of 4
        </div>
      </div>
      <div class="wizard-content">
        <!-- Step 1: Welcome -->
        <div v-if="currentStep === 1" class="wizard-step">
          <h3>Let's get you set up!</h3>
          <p>This quick setup wizard will help you connect your accounts and create your first project.</p>
        </div>

        <!-- Step 2: Gemini API Key -->
        <div v-if="currentStep === 2" class="wizard-step">
          <h3>Connect to Gemini AI</h3>
          <p>
            To enable AI features, you'll need a Google Gemini API key.
            <a href="https://aistudio.google.com/app/apikey" target="_blank" class="text-link">Click here to get your key</a>, then paste it below.
          </p>
          <div class="form-group">
            <label for="gemini-api-key">Gemini API Key</label>
            <input type="password" id="gemini-api-key" v-model="geminiApiKey" placeholder="Enter your API key">
          </div>
           <p class="small-text">
            Your key is stored locally and is only used to communicate with the Gemini API. All API usage is billed to your own Google account.
          </p>
        </div>

        <!-- Step 3: Google Calendar -->
        <div v-if="currentStep === 3" class="wizard-step">
          <h3>Connect Google Calendar</h3>
          <p>Link your Google Account to seamlessly manage your calendar events directly within the app.</p>
          <div v-if="isAuthorized" class="auth-success">
            <p>✓ Successfully connected!</p>
          </div>
          <button v-else @click="authorize" class="button-primary" :disabled="isAuthorizing || !googleCredentialsConfigured">
            {{ isAuthorizing ? 'Connecting...' : 'Connect Google Account' }}
          </button>
          <p v-if="!googleCredentialsConfigured" class="small-text">
            The Google API credentials are not configured in the application's settings.
            <button @click="goToSettings" class="button-secondary">Go to Settings</button>
          </p>
        </div>

        <!-- Step 4: Create First Project -->
        <div v-if="currentStep === 4" class="wizard-step">
          <h3>Create Your First Project</h3>
          <p>Projects help you organize your tasks. Let's create one now.</p>
          <div class="form-group">
            <label for="project-title">Project Title</label>
            <input type="text" id="project-title" v-model="projectTitle" placeholder="e.g., Q3 Marketing Campaign">
          </div>
        </div>
      </div>
      <div class="wizard-footer">
        <button @click="prevStep" v-if="currentStep > 1" class="button-secondary">Back</button>
        <button @click="nextStep" v-if="currentStep < 4" class="button-primary" :disabled="!canProceed">Next</button>
        <button @click="finish" v-if="currentStep === 4" class="button-primary" :disabled="!projectTitle">Finish</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

const emit = defineEmits(['finish']);

const currentStep = ref(1);
const geminiApiKey = ref('');
const isAuthorized = ref(false);
const isAuthorizing = ref(false);
const projectTitle = ref('');
const googleCredentialsConfigured = ref(false);

onMounted(async () => {
  try {
    googleCredentialsConfigured.value = await window.api.areGoogleCredentialsConfigured();
    console.log('[OnboardingWizard] Setting up onGoogleAuthSuccess listener.');
    window.api.onGoogleAuthSuccess(() => {
        console.log('[OnboardingWizard] google-auth-success event received!');
        isAuthorized.value = true;
        if (currentStep.value === 3) {
            console.log('[OnboardingWizard] Current step is 3, calling nextStep().');
            nextStep();
        } else {
            console.log(`[OnboardingWizard] Current step is ${currentStep.value}, not calling nextStep().`);
        }
    });
  } catch (error) {
    console.error('Error checking Google credentials configuration:', error);
  }
});

const canProceed = computed(() => {
  if (currentStep.value === 2) {
    return geminiApiKey.value.trim() !== '';
  }
  if (currentStep.value === 3) {
    return isAuthorized.value;
  }
  return true;
});

const nextStep = () => {
  if (currentStep.value < 4) {
    currentStep.value++;
  }
};

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--;
  }
};

const authorize = async () => {
  isAuthorizing.value = true;
  try {
    await window.api.authorizeGoogleAccount();
  } catch (error) {
    console.error('Google Authorization failed:', error);
  } finally {
    isAuthorizing.value = false;
  }
};

const finish = async () => {
  if (!projectTitle.value || !geminiApiKey.value) return;
  try {
    // 1. Save the API Key
    await window.api.updateConfig({
      ai: {
        apiKey: geminiApiKey.value
      }
    });

    // 2. Create the project
    await window.api.createProject({ title: projectTitle.value });

    // 3. Mark onboarding as complete
    await window.api.setOnboardingCompleted();

    emit('finish');
  } catch (error) {
    console.error('Error during finish process:', error);
    // You might want to show an error message to the user here
  }
};
</script>

<style scoped>
.wizard-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.wizard-container {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
  width: 500px;
  max-width: 90%;
  display: flex;
  flex-direction: column;
}

.wizard-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.wizard-header h2 {
  margin: 0;
  font-size: 1.25rem;
}

.step-indicator {
  font-size: 0.875rem;
  color: #666;
  font-weight: 500;
}

.wizard-content {
  padding: 2rem;
  min-height: 200px;
}

.wizard-step h3 {
  margin-top: 0;
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.wizard-step p {
  color: #555;
  line-height: 1.6;
  margin-bottom: 1.5rem;
}

.small-text {
    font-size: 0.8rem;
    color: #777;
    margin-top: 1rem;
}

.text-link {
  color: var(--accent-primary);
  text-decoration: none;
}
.text-link:hover {
  text-decoration: underline;
}


.auth-success {
  color: #27ae60;
  font-weight: 600;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
}

.wizard-footer {
  padding: 1.5rem;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

button {
  padding: 10px 20px;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.button-primary {
  background-color: var(--accent-primary);
  color: white;
}
.button-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.button-secondary {
  background-color: #e0e0e0;
  color: #333;
}
.button-secondary:hover:not(:disabled) {
  background-color: #dcdcdc;
}
</style>
