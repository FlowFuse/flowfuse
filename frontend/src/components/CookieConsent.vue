<template>
    <div
        v-if="consent.shouldShowBanner"
        class="ff-cookie-consent"
        data-el="cookie-consent-banner"
        role="region"
        aria-label="Cookie consent"
    >
        <h2 class="ff-cookie-consent--title">This site uses cookies</h2>
        <p class="ff-cookie-consent--text">
            We use cookies to keep FlowFuse working and, with your permission, to understand
            how you use the platform and improve your experience.
            <a href="https://flowfuse.com/privacy-policy/" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
        </p>
        <div class="ff-cookie-consent--actions">
            <ff-button kind="secondary" size="small" data-action="reject-cookies" @click="consent.reject()">
                Reject all
            </ff-button>
            <ff-button kind="primary" size="small" data-action="accept-cookies" @click="consent.accept()">
                Accept all
            </ff-button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useCookieConsentStore } from '../stores/cookie-consent'

const consent = useCookieConsentStore()
</script>

<style lang="scss">
.ff-cookie-consent {
    position: fixed;
    bottom: 1rem;
    left: 1rem;
    z-index: 1000;
    max-width: 28rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    background-color: $ff-white;
    color: $ff-grey-800;
    border: 1px solid $ff-color--border;
    border-radius: 6px;
    box-shadow: 0px 4px 8px 0px rgba(0, 0, 0, 0.25);

    &--title {
        font-size: 1rem;
        font-weight: 600;
        margin: 0;
    }

    &--text {
        font-size: 0.875rem;
        line-height: 1.4;
        margin: 0;

        a {
            color: $ff-blue-600;
            text-decoration: underline;
        }
    }

    &--actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
    }
}
</style>
