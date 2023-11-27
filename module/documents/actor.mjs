import { CANDELAFVTT } from '../helpers/config.mjs';

/**
 * Extend the base Actor document by defining a custom roll data structure.
 * @extends {Actor}
 */
export class CandelafvttActor extends Actor {
    /** @override */
    prepareData() {
        // Prepare data for the actor. Calling the super version of this executes
        // the following, in order: data reset (to clear active effects),
        // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
        // prepareDerivedData().
        super.prepareData();
    }

    /** @override */
    prepareBaseData() {
        // Data modifications in this step occur before processing embedded
        // documents or derived data.
    }

    /**
     * @override
     * Augment the basic actor data with additional dynamic data. Typically,
     * you'll want to handle most of your calculated/derived data in this step.
     * Data calculated in this step should generally not exist in template.json
     * (such as ability modifiers rather than ability scores) and should be
     * available both inside and outside of character sheets (such as if an actor
     * is queried and has a roll executed directly from it).
     */
    async prepareDerivedData() {
        const actorData = this;
        const systemData = actorData.system;
        const flags = actorData.flags.candelafvtt || {};

        // Make separate methods for each Actor type (character, npc, etc.) to keep
        // things organized.
        this._prepareCharacterData(actorData);
        this._prepareCircleData(actorData);
    }

    /**
     * Prepare Character type specific data
     */
    async _prepareCharacterData(actorData) {
        if (actorData.type !== CANDELAFVTT.types.character) return;

        // Get role and spec from items
        for (let i of actorData.items) {
            // set role.
            if (i.type === CANDELAFVTT.types.role) {
                actorData.system.role = i;
            }
            // set specialty.
            else if (i.type === CANDELAFVTT.types.specialty) {
                actorData.system.specialty = i;
            }
        }

        // calculate resistances
        for (let [k, v] of Object.entries(actorData.system.actionCategories)) {
            v.resistance.max = Math.floor(v.drives.max / 3);
        }
    }

    /**
     * Prepare Circle type specific data.
     */
    _prepareCircleData(actorData) {
        if (actorData.type !== CANDELAFVTT.types.circle) return;

        // set resources based on circle members
        let memberCount = actorData.system.members ? actorData.system.members.length : 0;
        for (let [k, v] of Object.entries(actorData.system.resources)) {
            v.max = memberCount + 1;
        }

        // populate illumination array with illuminationCount values and start to count with 1
        actorData.system.illuminationArray = [...Array(actorData.system.illumination.max).keys()];
        for (let [e, i] of actorData.system.illuminationArray.entries()) {
            actorData.system.illuminationArray[i] = e + 1;
        }

        // find and add members
        for (let [i, m] of actorData.system.members.entries()) {
            const actors = foundry.utils.parseUuid(m.uuid);
            const member = actors.collection.get(actors.documentId);
            actorData.system.members[i].name = member.name;
        }
    }

    /**
     * Override getRollData() that's supplied to rolls.
     */
    getRollData() {
        const data = super.getRollData();

        // Prepare character roll data.
        this._getCharacterRollData(data);
        this._getCircleRollData(data);

        return data;
    }

    /**
     * Prepare character roll data.
     */
    _getCharacterRollData(data) {
        if (this.type !== CANDELAFVTT.types.character) return;
    }

    /**
     * Prepare Circle roll data.
     */
    _getCircleRollData(data) {
        if (this.type !== CANDELAFVTT.types.circle) return;
    }
}
