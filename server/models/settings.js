Schemas.Settings = new SimpleSchema({
  name: {
    type: String,
  },
  value: {
    type: Object,
    blackbox: true,
  },
});

Models.Settings = new Models.Base('settings');
Models.Settings.attachSchema(Schemas.Settings);
