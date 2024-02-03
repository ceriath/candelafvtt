/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function () {
    return loadTemplates([
        // Actor partials.
        'systems/candelafvtt/templates/actor/parts/actor-illumination.hbs',
        'systems/candelafvtt/templates/actor/parts/actor-gear.hbs',
        'systems/candelafvtt/templates/actor/parts/actor-abilities.hbs',
        'systems/candelafvtt/templates/actor/parts/actor-actions.hbs',
        'systems/candelafvtt/templates/actor/parts/actor-biography.hbs',
        'systems/candelafvtt/templates/actor/parts/actor-members.hbs',
        'systems/candelafvtt/templates/actor/parts/actor-illumination-keys.hbs',
    ]);
};
