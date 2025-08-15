<template>
  <Transition name="fade">
    <div v-if="isVisible" class="popup-overlay" @click.self="handleDismiss">
      <div class="popup-container">
        <div class="popup-header">
          <i class="fa-thumbprint fa-light fa-lock"></i>
          <h2>Welcome to MonoBlocks Professional</h2>
          <span class="edition-badge">Unregistered Trial Edition</span>
        </div>

        <div class="popup-content">
          <div class="trial-status">
            <p>
              You have been enjoying MonoBlocks Professional for <strong>42 days</strong> without
              paying a single cent.
            </p>
            <p class="subtext">This makes you a valued trial user and a terrible customer.</p>
          </div>

          <div class="features-section">
            <h3>Register now to unlock:</h3>
            <ul class="features-list premium">
              <li>
                <i class="fa-thumbprint fa-light fa-check"></i> Unlimited Block Placement
                Solutions™
              </li>
              <li>
                <i class="fa-thumbprint fa-light fa-check"></i> Enterprise-Class Grid Alignment
                Technology
              </li>
              <li>
                <i class="fa-thumbprint fa-light fa-check"></i> Next-Level Layer Productivity
                Workflows
              </li>
              <li>
                <i class="fa-thumbprint fa-light fa-check"></i> 24/7 Corporate Compliance Pixel
                Management
              </li>
              <li>
                <i class="fa-thumbprint fa-light fa-check"></i> Priority Support (we might reply
                within a fiscal quarter)
              </li>
            </ul>
          </div>

          <div class="features-section">
            <h3>Or… Continue using the free version with:</h3>
            <ul class="features-list limitations">
              <li>
                <i class="fa-thumbprint fa-light fa-xmark"></i> Occasional nag screens like this one
              </li>
              <li>
                <i class="fa-thumbprint fa-light fa-xmark"></i> Limited to 2.3 creativity units per
                week
              </li>
              <li>
                <i class="fa-thumbprint fa-light fa-xmark"></i> Random "Corporate Mode" popups
                during intense creative moments
              </li>
            </ul>
          </div>

          <div class="pricing">
            <i class="fa-thumbprint fa-light fa-credit-card"></i>
            <strong>Registration fee:</strong> $49,999.99 per seat/year
            <p class="fine-print">
              (plus onboarding, implementation, and a 600-page PDF manual you won't read)
            </p>
          </div>

          <div class="popup-actions">
            <button class="btn btn-primary" @click="handleRegister">Register Now</button>
            <button class="btn btn-secondary" @click="handleRemindLater">Remind Me Later</button>
            <button class="btn btn-danger" @click="handleEnjoySuffering">I Enjoy Suffering</button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
const isVisible = ref(false)

onMounted(() => {
  // Show popup after a short delay for effect
  setTimeout(() => {
    isVisible.value = true
  }, 500)
})

const handleRegister = () => {
  alert('Your credit card has been declined. Please try a different fiscal quarter.')
  isVisible.value = false
}

const handleRemindLater = () => {
  alert('We will remind you in 37 seconds.')
  isVisible.value = false
}

const handleEnjoySuffering = () => {
  alert('Excellent choice. Your masochism has been noted in our enterprise analytics dashboard.')
  isVisible.value = false
}

const handleDismiss = () => {
  isVisible.value = false
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.popup-container {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 12px;
  max-width: 850px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.popup-header {
  padding: 25px 30px;
  display: flex;
  align-items: center;
  gap: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.02);
}

.popup-header i.fa-thumbprint {
  font-size: 42px;
  color: #00d9ff;
  flex-shrink: 0;
}

.popup-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #ffffff;
  text-transform: uppercase;
  letter-spacing: 1px;
  flex: 1;
}

.edition-badge {
  display: inline-block;
  background: linear-gradient(90deg, #ff6b6b, #ff4444);
  color: white;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
  flex-shrink: 0;
}

.popup-content {
  padding: 30px;
  color: #e0e0e0;
}

.trial-status {
  background: rgba(255, 107, 107, 0.1);
  border-left: 4px solid #ff6b6b;
  padding: 20px;
  margin-bottom: 30px;
  border-radius: 4px;
}

.trial-status p {
  margin: 0 0 10px 0;
}

.trial-status .subtext {
  font-size: 14px;
  color: #999;
  font-style: italic;
  margin: 10px 0 0 0;
}

.features-section {
  margin-bottom: 25px;
}

.features-section h3 {
  font-size: 18px;
  margin-bottom: 15px;
  color: #ffffff;
  font-weight: 600;
}

.features-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.features-list li {
  padding: 4px 0;
  font-size: 14px;
  display: flex;
  align-items: center;
  line-height: 1.2;
}

.features-list i {
  margin-right: 12px;
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.features-list.premium i {
  color: #4ade80;
}

.features-list.limitations i {
  color: #ff6b6b;
}

.pricing {
  background: rgba(255, 255, 255, 0.05);
  padding: 20px;
  border-radius: 8px;
  margin: 30px 0;
  text-align: center;
}

.pricing i {
  color: #ffd700;
  margin-right: 10px;
}

.pricing strong {
  color: #ffffff;
  font-size: 16px;
}

.fine-print {
  font-size: 11px;
  color: #999;
  margin-top: 8px;
  font-style: italic;
}

.popup-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  padding-top: 10px;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}

.btn-primary {
  background: linear-gradient(135deg, #00d9ff, #0099cc);
  color: white;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #00b8e6, #0088bb);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.15);
}

.btn-danger {
  background: linear-gradient(135deg, #ff6b6b, #ff4444);
  color: white;
}

.btn-danger:hover {
  background: linear-gradient(135deg, #ff5555, #ff3333);
}

/* Mobile responsiveness */
@media (max-width: 640px) {
  .popup-container {
    max-height: 95vh;
  }

  .popup-header h2 {
    font-size: 22px;
  }

  .popup-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
