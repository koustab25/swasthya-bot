class UserProfile {
  constructor() {
    this.profile = this.loadProfile();
  }

  // Load profile from localStorage
  loadProfile() {
    const defaultProfile = {
      name: '',
      age: '',
      location: '',
      children: [],
      language: 'en',
      notifications: true
    };

    try {
      const saved = JSON.parse(localStorage.getItem('swasthya_profile')) || {};
      return { ...defaultProfile, ...saved };
    } catch {
      return defaultProfile;
    }
  }

  // Update profile
  updateProfile(updates) {
    this.profile = { ...this.profile, ...updates };
    this.saveProfile();
    return this.profile;
  }

  // Save to localStorage
  saveProfile() {
    localStorage.setItem('swasthya_profile', JSON.stringify(this.profile));
  }

  // Add child
  addChild(name, age) {
    this.profile.children.push({ name, age: parseInt(age) });
    this.saveProfile();
  }

  // Remove child
  removeChild(index) {
    this.profile.children.splice(index, 1);
    this.saveProfile();
  }

  // Get vaccination reminders
  getVaccinationReminders() {
    if (!this.profile.children.length) return null;

    return this.profile.children.map(child => {
      const age = parseInt(child.age);
      return {
        child: child.name,
        age: age,
        vaccines: this.getVaccinesByAge(age),
        nextCheckup: this.getNextCheckup(age)
      };
    }).filter(r => r.vaccines.length > 0);
  }

  // Simple vaccine schedule
  getVaccinesByAge(age) {
    if (age === 0) return ['BCG', 'OPV-0', 'Hepatitis B'];
    if (age === 6) return ['OPV-1', 'Pentavalent-1', 'Rotavirus'];
    if (age === 10) return ['OPV-2', 'Pentavalent-2'];
    if (age === 14) return ['OPV-3', 'Pentavalent-3'];
    if (age === 9) return ['MMR-1'];
    if (age === 16) return ['MMR-2'];
    if (age === 18) return ['DPT Booster'];
    return [];
  }

  getNextCheckup(age) {
    if (age < 1) return 'Monthly';
    if (age < 2) return 'Every 3 months';
    if (age < 5) return 'Every 6 months';
    return 'Yearly';
  }

  // Check if profile is complete
  isComplete() {
    return this.profile.name && this.profile.age && this.profile.location;
  }

  // Export profile data
  exportData() {
    return {
      profile: this.profile,
      timestamp: new Date().toISOString()
    };
  }
}