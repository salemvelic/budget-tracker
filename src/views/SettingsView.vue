<script setup lang="ts">
import BackupPanel from '@/components/BackupPanel.vue'
import RulesEditor from '@/components/RulesEditor.vue'
import SettingsForm from '@/components/SettingsForm.vue'
</script>

<template>
  <div class="space-y-6">
    <SettingsForm />
    <RulesEditor />
    <BackupPanel />
  </div>
</template>
