/**
 * Base Action Class
 */
export class Action {
    /**
     * Roll an action
     * @param {any} action   The actual action object
     * @param {string} actionId The key id of the action
     */
    static async rollAction(action, actionId) {
        const result = await this._prepareActionRoll(actionId);
        if (result == null) return; // dialog canceled
        const [drives, extraGildedDice] = result

        const actionGilded = action.gilded ? 1 : 0
        const normalDice = action.value - actionGilded + drives
        const gildedDice = actionGilded + extraGildedDice
        var dice = []

        if (normalDice > 0) {
            // normal dice
            const die = new Die({
                number: normalDice,
                faces: 6,
                modifiers: ['kh'],
            });
            dice = [die]
        }
        if (gildedDice > 0) {
            // gilded dice
            const die = new Die({
                number: gildedDice,
                faces: 6,
                options: { flavor: 'gilded' },
                modifiers: ['kh'],
            });
            if (dice.length > 0) {
                const plus = new OperatorTerm({ operator: '+' });
                dice.push(plus)
            }
            dice.push(die)
        }

        if (!dice.length) {
            // no dice, roll with disadvantage
            const die = new Die({
                number: 2,
                faces: 6,
                modifiers: ['kl'],
            });
            dice = [die]
        }

        let r = Roll.fromTerms(dice);
        await r.evaluate();

        // construct chat message
        const speaker = ChatMessage.getSpeaker({ actor: this.actor });
        const rollMode = game.settings.get('core', 'rollMode');
        const label = `[action] ` + game.i18n.localize(`CANDELAFVTT.${actionId}`);
        const content = await renderTemplate('systems/candelafvtt/templates/chat/roll.hbs', r);

        const msg = {
            content: content,
            speaker: speaker,
            rollMode: rollMode,
            flavor: label,
            type: CONST.CHAT_MESSAGE_TYPES.ROLL,
            rolls: [r],
        };

        AudioHelper.play({ src: 'sounds/dice.wav', volume: 0.8, autoplay: true, loop: false }, true);
        // post to chat
        CONFIG.ChatMessage.documentClass.create(msg, {});

        return r;
    }

    /**
     * Prepare a roll by getting necessary information via user dialog
     * @param {string} actionId The key id of the action
     * @private
     */
    static async _prepareActionRoll(actionId) {
        let title = game.i18n.localize(`CANDELAFVTT.${actionId}`);
        let content = await renderTemplate('systems/candelafvtt/templates/chat/roll-dialog.hbs');
        let options = {};

        return new Promise(resolve => {
            new Dialog(
                {
                    title,
                    content,
                    buttons: {
                        roll: {
                            label: game.i18n.localize('CANDELAFVTT.roll'),
                            callback: html => resolve(this._onRollDialogSubmit(html)),
                        },
                    },
                    default: 'roll',
                    close: () => resolve(null),
                },
                options
            ).render(true);
        });
    }

    /**
     * Read the drives from the submitted form
     * @param {html} html The submitted html containing the form
     * @private
     */
    static async _onRollDialogSubmit(html) {
        const form = html[0].querySelector('form');
        const drives = parseInt(form.drives.value);
        const gildedDice = parseInt(form.gildedDice.value);
        return [drives, gildedDice];
    }
}
