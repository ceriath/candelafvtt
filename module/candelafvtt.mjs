// Import document classes.
import { CandelafvttActor } from './documents/actor.mjs';
import { CandelafvttItem } from './documents/item.mjs';
// Import sheet classes.
import { CandelafvttActorSheet } from './sheets/actor-sheet.mjs';
import { CandelafvttItemSheet } from './sheets/item-sheet.mjs';
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from './helpers/templates.mjs';
import { CANDELAFVTT } from './helpers/config.mjs';

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', async function () {
    // Add utility classes to the global game object so that they're more easily
    // accessible in global contexts.
    game.candelafvtt = {
        CandelafvttActor,
        CandelafvttItem,
        rollItemMacro,
    };

    // Add custom constants for configuration.
    CONFIG.CANDELAFVTT = CANDELAFVTT;

    /**
     * Set an initiative formula for the system
     * @type {String}
     */
    CONFIG.Combat.initiative = {
        formula: '1d20',
        decimals: 2,
    };

    // Define custom Document classes
    CONFIG.Actor.documentClass = CandelafvttActor;
    CONFIG.Item.documentClass = CandelafvttItem;

    // Register sheet application classes
    Actors.unregisterSheet('core', ActorSheet);
    Actors.registerSheet('candelafvtt', CandelafvttActorSheet, {
        makeDefault: true,
    });
    Items.unregisterSheet('core', ItemSheet);
    Items.registerSheet('candelafvtt', CandelafvttItemSheet, {
        makeDefault: true,
    });

    // Preload Handlebars templates.
    return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

Handlebars.registerHelper('toLowerCase', function (str) {
    return str.toLowerCase();
});

Handlebars.registerHelper('times', function (n, block) {
    var accum = '';
    for (var i = 0; i < n; ++i) {
        block.data.index = i;
        block.data.first = i === 0;
        block.data.last = i === n - 1;
        accum += block.fn(this);
    }
    return accum;
});

Handlebars.registerHelper('le', function (left, right) {
    return left <= right;
});

Handlebars.registerHelper('lt', function (left, right) {
    return left < right;
});

Handlebars.registerHelper('ge', function (left, right) {
    return left >= right;
});

Handlebars.registerHelper('gt', function (left, right) {
    return left > right;
});

Handlebars.registerHelper('eq', function (left, right) {
    return left == right;
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once('ready', async function () {
    // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
    Hooks.on('hotbarDrop', (bar, data, slot) => createItemMacro(data, slot));
});

/* -------------------------------------------- */
/*  Dice So Nice! customizations                */
/* -------------------------------------------- */

Hooks.once('diceSoNiceReady', (dice3d) => {
    dice3d.addColorset({
        name: 'standard',
        description: 'Standard',
        category: 'Colors',
        foreground: ['#a4602c'],
        background: ['#235156'],
        outline: 'black',
        texture: 'cloudy_2',
    }, 'preferred');

    dice3d.addColorset({
        name: 'gilded',
        description: 'Gilded',
        category: 'Colors',
        foreground: ['#007a73'],
        background: ['#74594f'],
        outline: 'black',
        texture: 'cloudy_2',
    });

    dice3d.addSystem({ id: 'candelafvtt', name: 'Candela Obscura' }, 'preferred');
});  

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
    // First, determine if this is a valid owned item.
    if (data.type !== 'Item') return;
    if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
        return ui.notifications.warn('You can only create macro buttons for owned Items');
    }
    // If it is, retrieve it based on the uuid.
    const item = await Item.fromDropData(data);

    // Create the macro command using the uuid.
    const command = `game.candelafvtt.rollItemMacro("${data.uuid}");`;
    let macro = game.macros.find(m => m.name === item.name && m.command === command);
    if (!macro) {
        macro = await Macro.create({
            name: item.name,
            type: 'script',
            img: item.img,
            command: command,
            flags: { 'candelafvtt.itemMacro': true },
        });
    }
    game.user.assignHotbarMacro(macro, slot);
    return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemUuid) {
    // Reconstruct the drop data so that we can load the item.
    const dropData = {
        type: 'Item',
        uuid: itemUuid,
    };
    // Load the item from the uuid.
    Item.fromDropData(dropData).then(item => {
        // Determine if the item loaded and if it's an owned item.
        if (!item || !item.parent) {
            const itemName = item?.name ?? itemUuid;
            return ui.notifications.warn(`Could not find item ${itemName}. You may need to delete and recreate this macro.`);
        }

        // Trigger the item roll
        item.roll();
    });
}
