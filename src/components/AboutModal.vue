<template>
  <Transition name="fade">
    <div v-if="isVisible" class="modal-overlay" @click.self="close">
      <div class="modal-container">
        <div class="modal-header">
          <i class="fa-thumbprint fa-light fa-paperclip"></i>
          <h2>About MonoBlocks Professional</h2>
          <button class="close-btn" @click="close">
            <i class="fa-thumbprint fa-light fa-xmark"></i>
          </button>
        </div>

        <div class="modal-content">
          <p>
            <strong>MonoBlocks Professional</strong> is not just software — it's a fully integrated,
            enterprise-grade
            <em>Monospace Character Drawing and Layer Management Solution™</em> designed to empower
            forward-thinking organizations to synergize creativity across scalable grid-based
            ecosystems.
          </p>

          <p>
            Our patented <strong>Block-Optimized Rendering Architecture (BORA)</strong> leverages
            the latest in <em>Cutting-Edge Monospace Alignment Technology™</em> to deliver
            unparalleled productivity enhancements for professional creative workflows. Whether
            you're a seasoned ASCII artisan or a newly onboarded pixel-placement associate,
            MonoBlocks Professional ensures each character is meticulously deployed with the
            accuracy and compliance your stakeholders demand.
          </p>

          <p>
            Featuring industry-leading <strong>Layer Management Solutions</strong>, seamless
            <strong>Workflow Orchestration</strong>, and our exclusive
            <strong>Enterprise Compliance Pixel Audit Protocols</strong>, MonoBlocks Professional is
            built to align with your organization's KPIs, OKRs, and B.S.
          </p>

          <p>
            It's time to future-proof your creativity with a solution that's as scalable as your
            quarterly PowerPoint decks and as agile as your middle management thinks they are.
          </p>

          <p class="tagline">
            <strong>MonoBlocks Professional</strong> — Where creativity meets enterprise excellence…
            one meticulously aligned character at a time.
            <i class="fa-thumbprint fa-light fa-building"></i>
          </p>
        </div>

        <div class="modal-footer">
          <button class="btn btn-primary" @click="close">Acknowledge Excellence</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
const isVisible = ref(false)

const open = () => {
  isVisible.value = true
}

const close = () => {
  isVisible.value = false
}

defineExpose({
  open,
  close,
})
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

.modal-overlay {
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

.modal-container {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 12px;
  max-width: 750px;
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header {
  padding: 25px 30px;
  display: flex;
  align-items: center;
  gap: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.02);
}

.modal-header i.fa-info-circle {
  font-size: 32px;
  color: #00d9ff;
  flex-shrink: 0;
}

.modal-header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #ffffff;
  text-transform: uppercase;
  letter-spacing: 1px;
  flex: 1;
}

.close-btn {
  background: none;
  border: none;
  color: #999;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
}

.close-btn:hover {
  color: #fff;
}

.modal-content {
  padding: 30px;
  color: #e0e0e0;
}

.modal-content p {
  margin: 0 0 20px 0;
  line-height: 1.7;
  font-size: 15px;
}

.modal-content strong {
  color: #ffffff;
  font-weight: 600;
}

.modal-content em {
  color: #00d9ff;
  font-style: normal;
  font-weight: 500;
}

.tagline {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
  font-size: 16px;
  color: #b0b0b0;
}

.tagline strong {
  color: #00d9ff;
}

.tagline i {
  color: #ffd700;
  margin-left: 10px;
  font-size: 18px;
}

.modal-footer {
  padding: 20px 30px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.02);
  display: flex;
  justify-content: center;
}

.btn {
  padding: 12px 32px;
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

/* Mobile responsiveness */
@media (max-width: 640px) {
  .modal-container {
    max-height: 95vh;
  }

  .modal-header h2 {
    font-size: 18px;
  }

  .modal-content p {
    font-size: 14px;
  }
}
</style>
