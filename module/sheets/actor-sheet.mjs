import { Action } from '../documents/action.mjs';
import { deepFind } from '../helpers/util.mjs';

import { CANDELAFVTT } from '../helpers/config.mjs';

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class CandelafvttActorSheet extends ActorSheet {
    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ['candelafvtt', 'sheet', 'actor'],
            template: 'systems/candelafvtt/templates/actor/actor-sheet.hbs',
            width: 600,
            height: 600,
            tabs: [
                {
                    navSelector: '.sheet-tabs',
                    contentSelector: '.sheet-body',
                    initial: 'actions',
                },
                {
                    navSelector: '.bio-tabs',
                    contentSelector: '.bio-body',
                    initial: 'bio-background',
                },
            ],
        });
    }

    /** @override */
    get template() {
        return `systems/candelafvtt/templates/actor/actor-${this.actor.type.toLowerCase()}-sheet.hbs`;
    }

    /* -------------------------------------------- */

    /** @override */
    getData() {
        // Retrieve the data structure from the base sheet. You can inspect or log
        // the context variable to see the structure, but some key properties for
        // sheets are the actor object, the data object, whether or not it's
        // editable, the items array, and the effects array.
        const context = super.getData();

        // Use a safe clone of the actor data for further operations.
        const actorData = this.actor.toObject(false);

        // Add the actor's data to context.data for easier access, as well as flags.
        context.system = actorData.system;
        context.flags = actorData.flags;
        // Prepare character data and items.
        if (actorData.type == CONFIG.CANDELAFVTT.types.character) {
            this._prepareItems(context);
            this._prepareCharacterData(context);
        }

        // Prepare circle data and items.
        if (actorData.type == CONFIG.CANDELAFVTT.types.circle) {
            this._prepareItems(context);
            this._prepareCircleData(context);
        }

        // Add roll data for TinyMCE editors.
        context.rollData = context.actor.getRollData();

        // TODO remove
        console.log(context);

        return context;
    }

    /**
     * Prepare character sheets.
     *
     * @param {Object} context The actor context.
     */
    async _prepareCharacterData(context) {
        // get current circle data
        if (context.system.circle.uuid) {
            const actors = foundry.utils.parseUuid(context.system.circle.uuid);
            let circle = actors.collection.get(actors.documentId);
            if (!circle) {
                // circle is probably gone, clear it
                let updateData = {};
                updateData['system.circle.uuid'] = '';
                updateData['system.circle.name'] = '';
                updateData['system.circle.color'] = '';
                context.system.circle.name = '';
                context.system.circle.color = '';
                await this.actor.update(updateData);
            } else {
                context.system.circle.name = circle.name;
                context.system.circle.color = circle.system.color;
                document.documentElement.style.setProperty('--color-shadow-primary', circle.system.color);
            }
        }
    }

    /**
     * Prepare circle sheets.
     *
     * @param {Object} context The actor context.
     */
    _prepareCircleData(context) {
        // add image paths
        context.system.illuminationCandleImg = 'systems/candelafvtt/img/illumination_candle.png';
        context.system.flameImg = 'systems/candelafvtt/img/flame.svg';
    }

    /**
     * Organize and classify Items.
     *
     * @param {Object} context The actor context.
     */
    _prepareItems(context) {
        // Initialize containers.
        const gear = [];
        const abilities = [];

        // Iterate through items, allocating to containers
        for (let i of context.items) {
            i.img = i.img || DEFAULT_TOKEN;
            if (i.type === CONFIG.CANDELAFVTT.types.gear) {
                gear.push(i);
            }
            // Append to features.
            else if (i.type === CONFIG.CANDELAFVTT.types.ability) {
                abilities.push(i);
            }
        }

        // Assign and return
        context.gear = gear;
        context.abilities = abilities;
    }

    /* -------------------------------------------- */

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);

        // Render the item sheet for viewing/editing prior to the editable check.
        html.find('.item-edit').click(ev => {
            const li = $(ev.currentTarget).parents('.item');
            const item = this.actor.items.get(li.data('itemId'));
            item.sheet.render(true);
        });

        // -------------------------------------------------------------
        // Everything below here is only needed if the sheet is editable
        if (!this.isEditable) return;

        // Add Inventory Item
        html.find('.item-create').click(this._onItemCreate.bind(this));

        // Delete Inventory Item
        html.find('.item-delete').click(ev => {
            const li = $(ev.currentTarget).parents('.item');
            const item = this.actor.items.get(li.data('itemId'));
            item.delete();
            li.slideUp(200, () => this.render(false));
        });

        if (this.actor.type == CANDELAFVTT.types.circle) {
            // illumination.
            html.find('.illumination-point').click(this.onIlluminationClick.bind(this));
            html.find('.illumination-reset').click(this.onIlluminationReset.bind(this));

            // remove circle member.
            html.find('.member-remove').click(this.onMemberRemove.bind(this));
        }

        // Rollable abilities.
        html.find('.rollable').click(this._onRoll.bind(this));

        html.find('.character-biography').click(() => {
            setTimeout(() => {
                this.render(true);
            }, 50);
        });

        // Drag events for macros.
        if (this.actor.isOwner) {
            let handler = ev => this._onDragStart(ev);
            html.find('li.item').each((i, li) => {
                if (li.classList.contains('inventory-header')) return;
                li.setAttribute('draggable', true);
                li.addEventListener('dragstart', handler, false);
            });
        }
    }

    /**
     * Handle a dropped actor (which should be a circle being dropped on an actor)
     * @param {Event} event   The event
     * @param {any} actor   The actor ID object being dropped
     * @private
     */
    /** @override */
    async _onDropActor(event, actor) {
        let actors = foundry.utils.parseUuid(actor.uuid);
        let circle = actors.collection.get(actors.documentId);

        if (this.actor.type == CONFIG.CANDELAFVTT.types.character && circle.type == CONFIG.CANDELAFVTT.types.circle) {
            let updateData = {};
            updateData['system.circle.uuid'] = circle.uuid;
            updateData['system.circle.name'] = circle.name;
            updateData['system.circle.color'] = circle.system.color;
            let circleUpdateData = {};
            circleUpdateData['system.members'] = circle.system.members;
            circleUpdateData['system.members'].push({ uuid: this.actor.uuid });
            await this.actor.update(updateData);
            await circle.update(circleUpdateData);
        }

        super._onDropActor(event);
    }

    /**
     * Handle a dropped item
     * @param {Event} event   The originating click event
     * @private
     */
    /** @override */
    async _onDropItemCreate(item) {
        // if item is a role, ask for confirmation and clean out the current role and spec
        if (item.type == CONFIG.CANDELAFVTT.types.role) {
            let d = new Dialog({
                title: 'Change Role',
                content: '<p>Please confirm you want to change your role. This will also reset your specialty.</p>',
                buttons: {
                    yes: {
                        icon: '<i class="fas fa-check"></i>',
                        label: 'Yes',
                        callback: async () => {
                            await this.setSpecialty(null, true);
                            await this.setRole(item);
                            super._onDropItemCreate(item);
                        },
                    },
                    no: {
                        icon: '<i class="fas fa-times"></i>',
                        label: 'No',
                        callback: () => {},
                    },
                },
                default: 'no',
            });
            d.render(true);

            // if item is a spec, set the spec
        } else if (item.type == CONFIG.CANDELAFVTT.types.specialty) {
            this.setSpecialty(item);
            // else just let the default handler handle it
        } else {
            super._onDropItemCreate(item);
        }
    }

    /**
     * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
     * @param {Event} event   The originating click event
     * @private
     */
    async _onItemCreate(event) {
        event.preventDefault();
        const header = event.currentTarget;
        // Get the type of item to create.
        const type = header.dataset.type;
        // Grab any data associated with this control.
        const data = duplicate(header.dataset);
        // Initialize a default name.
        const name = `New ${type.capitalize()}`;
        // Prepare the item object.
        const itemData = {
            name: name,
            type: type,
            system: data,
        };
        // Remove the type from the dataset since it's in the itemData.type prop.
        delete itemData.system['type'];

        // Finally, create the item!
        return await Item.create(itemData, { parent: this.actor });
    }

    /**
     * Handle clickable rolls.
     * @param {Event} event   The originating click event
     * @private
     */
    _onRoll(event) {
        event.preventDefault();
        const element = event.currentTarget;
        const dataset = element.dataset;

        // Handle item rolls.
        if (dataset.rollType) {
            // normal item roll
            if (dataset.rollType == 'item') {
                const itemId = element.closest('.item').dataset.itemId;
                const item = this.actor.items.get(itemId);
                if (item) return item.roll();

                // action roll, use custom roll
            } else if (dataset.rollType == 'action') {
                const actionId = element.closest('.action').dataset.actionId;
                const actionPath = element.closest('.action').dataset.attribute;
                const action = deepFind(this.actor, actionPath);

                if (action) return Action.rollAction(action, actionId);
            }
        }

        // Handle rolls that supply the formula directly.
        if (dataset.roll) {
            let label = dataset.label ? `[ability] ${dataset.label}` : '';
            let roll = new Roll(dataset.roll, this.actor.getRollData());
            roll.toMessage({
                speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                flavor: label,
                rollMode: game.settings.get('core', 'rollMode'),
                type: CONST.CHAT_MESSAGE_TYPES.ROLL,
                rolls: [roll],
            });
            return roll;
        }
    }

    /* -------------------------------------------- */

    /**
     * Handle a click on illumination points.
     * @param {Event} event   The originating click event
     * @private
     */
    onIlluminationClick(event) {
        const button = event.currentTarget;
        const value = Number(button.dataset.value);
        const currentValue = this.actor.system.illumination.value;
        let updateData = {};
        // if clicking a selected point, reset it
        if (currentValue == value) {
            updateData['system.illumination.value'] = value - 1;
        } else {
            updateData['system.illumination.value'] = value;
        }
        this.actor.update(updateData);
    }

    /**
     * Handle a click on the illumination reset button.
     * @param {Event} event   The originating click event
     * @private
     */
    onIlluminationReset() {
        let updateData = {};
        updateData['system.illumination.value'] = 0;
        this.actor.update(updateData);
    }

    /**
     * Handle a click on the illumination reset button.
     * @param {Event} event   The originating click event
     * @private
     */
    onMemberRemove(event) {
        const uuid = $(event.currentTarget).closest('.item').data('memberUuid');

        let circleUpdateData = {};
        circleUpdateData['system.members'] = this.actor.system.members.filter(function (member) {
            return member.uuid !== uuid;
        });
        this.actor.update(circleUpdateData);

        const actors = foundry.utils.parseUuid(uuid);
        const actor = actors.collection.get(actors.documentId);
        console.log(actor);
        if (actor) {
            let actorUpdateData = {};
            actorUpdateData['system.circle.uuid'] = '';
            actorUpdateData['system.circle.color'] = '';
            actorUpdateData['system.circle.name'] = '';
            actor.update(actorUpdateData);
        }
    }

    /* -------------------------------------------- */

    /**
     * Reset the role
     * @param {Object} role   The new role
     * @private
     */
    async setRole(role) {
        // get id of the current role of the actor
        let embeddedUpdateData = [];
        for (let i of this.actor.items) {
            if (i.type == CONFIG.CANDELAFVTT.types.role) {
                embeddedUpdateData.push(i.id);
            }
        }

        // delete current role of the actor
        await this.actor.deleteEmbeddedDocuments('Item', embeddedUpdateData);

        // prepare new role data
        let updateData = {};
        updateData['system.role'] = role;

        // set new role
        await this.actor.update(updateData);
    }

    /**
     * (Re)set the specialty
     * @param {Object} spec   The new role
     * @param {boolean} reset Force a reset
     * @private
     */
    async setSpecialty(spec, reset = false) {
        // check if specialty matches role or reset is forced
        if (reset || this.checkSpecialtyAgainstRole(spec.system.roleIdentifier)) {
            // find current specialty
            let embeddedUpdateData = [];
            for (let i of this.actor.items) {
                if (i.type == CONFIG.CANDELAFVTT.types.specialty) {
                    embeddedUpdateData.push(i.id);
                }
            }
            // delete current specialty
            await this.actor.deleteEmbeddedDocuments('Item', embeddedUpdateData);

            // set new specialty
            if (!reset) {
                let updateData = {};
                updateData['system.specialty'] = spec;

                for (let [k, v] of Object.entries(spec.system.drives)) {
                    updateData['system.actionCategories.' + k + '.drives.max'] = v;
                    updateData['system.actionCategories.' + k + '.drives.value'] = v;
                    updateData['system.actionCategories.' + k + '.resistance.max'] = Math.floor(v / 3);
                    updateData['system.actionCategories.' + k + '.resistance.value'] = Math.floor(v / 3);
                }
                for (let [ck, cv] of Object.entries(spec.system.actionRatings)) {
                    for (let [k, v] of Object.entries(cv)) {
                        updateData['system.actionCategories.' + ck + '.actions.' + k + '.value'] = v;
                    }
                }

                await this.actor.update(updateData);
            }
            // if the spec is invalid, prompt an error and return
        } else {
            ui.notifications.error(game.i18n.localize('CANDELAFVTT.errors-invalid-spec'));
            return;
        }
    }

    /**
     * Check if spec role id matches selected role
     * @param {string} specRoleID   The spec id
     * @private
     */
    checkSpecialtyAgainstRole(specRoleID) {
        if (this.actor.system.role && this.actor.system.role.system.identifier == specRoleID) {
            return true;
        }
        return false;
    }
}
