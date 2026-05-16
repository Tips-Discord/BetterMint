<script setup lang="ts">
import SettingsRow from "./settings-row.vue"
import SettingsCheckBox from "./settings-checkbox.vue"
import SettingsNumber from "./settings-number.vue"
import { options } from "@/options";

</script>

<template>
    <SettingsRow label="Auto move">
        <SettingsCheckBox v-model="options.enableAutoMove"/>
    </SettingsRow>
    <SettingsRow v-if="options.enableAutoMove" label="Auto move delay (ms)">
        <SettingsNumber v-model="options.autoMoveDelay" :min="0" :max="5000" :step="100"/>
    </SettingsRow>
</template>

<style scoped lang="scss"></style>