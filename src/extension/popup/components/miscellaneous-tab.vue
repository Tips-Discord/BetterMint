<script setup lang="ts">
import SettingsRow from "./settings-row.vue"
import SettingsCheckBox from "./settings-checkbox.vue"
import { options } from "@/options";

</script>

<template>
    <SettingsRow label="Auto move">
        <SettingsCheckBox v-model="options.enableAutoMove"/>
    </SettingsRow>
</template>

<style scoped lang="scss"></style>