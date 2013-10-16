var Panel = Backbone.GSModel.extend({

    defaults: {
        position: {
            left: 'auto',
            top: 50,
            right: 50,
            bottom: 'auto'
        },
        collapsed: false,
        auto_collapsed: false,
        hidden: false,
        state: 'closed',
        vertical: false
    },

    localStorage: new Backbone.LocalStorage('panels'),

    setters: {
    },

    toggleCollapsed: function(){
        this.save({collapsed: !this.get('collapsed')});
    },

    toggleHidden: function(){
        this.save({hidden: !this.get('hidden')});
    },

    initialize: function() {
    },

    destroy: function(options) {
    }
});
