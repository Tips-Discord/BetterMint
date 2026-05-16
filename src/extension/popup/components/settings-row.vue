<script setup lang="ts">
defineProps({
    label: {
        required: true,
        type: String,
    }
})
</script>

<template>
    <div class="settings-field-row">
        <div class="settings-field-label">{{ label }}</div>
        <slot></slot>
    </div>
</template>

<style scoped lang="scss">
@import "../global.scss";

.settings-field-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 3rem;
    border-bottom: 1px solid $border-color-dark;
    transition: background-color 0.12s ease;

    &:hover {
        background-color: rgba(255, 255, 255, 0.02);
    }

    .settings-field-label {
        font-size: 1rem;
    }
}
</style>