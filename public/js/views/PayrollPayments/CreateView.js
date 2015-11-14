define([
        "text!templates/PayrollPayments/CreateTemplate.html",
        "helpers"
    ],
    function (CreateTemplate, helpers) {
        "use strict";

        var CreateView = Backbone.View.extend({
            el      : '#content-holder',
            template: _.template(CreateTemplate),
            changedModels : {},

            initialize: function (options) {
                this.editCollection = options.collection;
                this.editCollection.url = 'payment/salary';
                this.editCollection.on('saved', this.savedNewModel, this);
                this.editCollection.on('updated', this.updatedOptions, this);

                this.render(options);

                this.$bodyContainer = this.$el.find('#payRoll-listTable');
            },

            events: {
                "click td.editable": "editRow",
                "change .autoCalc"       : "autoCalc",
                "change .editable"       : "setEditable",
                "keydown input.editing"  : "keyDown"
            },

            savedNewModel: function () {
                this.removeDialog();

                Backbone.history.fragment = '';
                Backbone.history.navigate("#easyErp/PayrollPayments/list", {trigger: true});
            },

            editRow: function (e, prev, next) {
                $(".newSelectList").remove();

                var self = this;
                var target = $(e.target);
                var isInput = target.prop("tagName") === 'INPUT';
                var tr = target.closest('tr');
                var payRollId = tr.attr('data-id');
                var tempContainer;
                var insertedInput;

                var inputHtml;

                if (payRollId && !isInput) {
                    if (this.payRollId) {
                        this.setChangedValueToModel();
                    }
                    this.payRollId = payRollId;
                    this.setChangedValueToModel();
                }


                if (!isInput) {
                    tempContainer = target.text();
                    inputHtml = '<input class="editing" type="text" data-value="' +
                    tempContainer + '" value="' + tempContainer +
                    '"  maxLength="4" style="display: block;" />';

                    target.html(inputHtml);

                    target.attr('data-cash', tempContainer);

                    insertedInput = target.find('input');
                    insertedInput.focus();
                    insertedInput[0].setSelectionRange(0, insertedInput.val().length);
                }

                return false;
            },

            setChangedValue: function () {
                if (!this.changed) {
                    this.changed = true;
                }
            },

            saveItem: function () {
                var model;

                for (var id in this.changedModels) {
                    model = this.editCollection.get(id);
                    model.changed = this.changedModels[id];
                }
                this.editCollection.save();
            },

            autoCalc: function (e) {
                var el = $(e.target);
                var td = $(el.closest('td'));
                var tr = el.closest('tr');
                var input = tr.find('input.editing');
                var editedElementRowId = tr.attr('data-id');
                var editModel = this.editCollection.get(editedElementRowId);
                var changedAttr;

                var diffOnCash = tr.find('.differenceAmount[data-content="onCash"]');
                var diffOnCard = tr.find('.differenceAmount[data-content="onCard"]');
                var diffTotal = tr.find('.differenceAmount[data-content="total"]');

                var value;
                var totalValue;
                var calcKey;
                var tdForUpdate;
                var paid;
                var calc;
                var parentKey;

                var diffOnCardRealValue;
                var diffOnCashRealValue;

                var paidTD;
                var calcTD;

                var newValue;
                var subValues = 0;

                if (!this.changedModels[editedElementRowId]) {
                    if (!editModel.id) {
                        this.changedModels[editedElementRowId] = editModel.attributes;
                    } else {
                        this.changedModels[editedElementRowId] = {};
                    }
                }

                if ($(td).hasClass('cash')) {
                    calcKey = 'onCash';
                    tdForUpdate = diffOnCash;
                    paidTD = tr.find('.paidAmount[data-content="onCash"]');
                    calcTD = tr.find('.calc[data-content="onCash"]');
                } else if ($(td).hasClass('card')) {
                    calcKey = 'onCard';
                    tdForUpdate = diffOnCard;
                    paidTD = tr.find('.paidAmount[data-content="onCard"]');
                    calcTD = tr.find('.calc[data-content="onCard"]');
                }

                if (tdForUpdate) {
                    paid = paidTD.attr('data-cash');
                    calc = calcTD.attr('data-cash');

                    paid = paid ? parseInt(paid) : 0;
                    calc = calc ? parseInt(calc) : 0;
                    newValue = parseInt(input.val());

                    if (paidTD.text()) {
                        paid = paid;
                    } else {
                        subValues = newValue - paid;
                        paid = newValue;
                        parentKey = 'paid';
                    }

                    if (calcTD.text()) {
                        calc = calc;
                    } else {
                        subValues = newValue - calc;
                        calc = newValue;
                        parentKey = 'calc';
                    }

                    if (subValues !== 0) {

                        value = paid - calc;

                        paidTD.attr('data-cash', paid);
                        paidTD.text(paid);
                        calcTD.attr('data-cash', calc);

                        tdForUpdate.text(this.checkMoneyTd(tdForUpdate, value));

                        diffOnCashRealValue = diffOnCash.attr('data-value');
                        diffOnCashRealValue = diffOnCashRealValue ? diffOnCashRealValue : diffOnCash.text();

                        totalValue = parseInt(diffOnCashRealValue) + parseInt(diffOnCardRealValue);
                        diffTotal.text(this.checkMoneyTd(diffTotal, totalValue));

                        changedAttr = this.changedModels[editedElementRowId];


                        changedAttr['differenceAmount'] = paid - calc;

                        this.getTotal(subValues, parentKey + '_' + calcKey, tr);
                    }
                }
            },

            isEditRows: function () {
                var edited = this.$bodyContainer.find('.edited');

                this.edited = edited;

                return !!edited.length;
            },

            getTotal: function (diff, calcKey, tr) {
                var totalElement;
                var prefVal;
                var totalDiff;
                var totalCalc;
                var diffVal;
                var calc = parseInt(tr.find('.total_calc_salary').attr('data-cash'));

                totalCalc = tr.find('.total_calc_salary');
                totalElement = tr.find('.total_' + calcKey);

                totalDiff = tr.find('.total_diff_onCash');

                prefVal = parseInt(totalElement.attr('data-cash'));

                totalElement.text(prefVal + diff);
                totalElement.attr('data-cash', prefVal + diff);

                if (calcKey === "calc_onCash") {
                    totalCalc.text(calc + diff);
                    totalCalc.attr('data-cash', calc + diff);
                }

                diffVal = (prefVal ? prefVal : 0) + diff - calc;

                totalDiff.text(diffVal);
                totalDiff.attr('data-cash', diffVal);
            },

            checkMoneyTd: function (td, value) {
                var moneyClassCheck = $(td).hasClass('money');
                var negativeMoneyClass = $(td).hasClass('negativeMoney');

                if (value < 0) {
                    if (moneyClassCheck) {
                        $(td).removeClass('money');
                    }
                    $(td).addClass('negativeMoney');
                    $(td).attr('data-value', value);
                    value *= -1;
                } else {
                    if (negativeMoneyClass) {
                        $(td).removeClass('negativeMoney');
                    }
                    $(td).addClass('money');
                }
                return value;
            },

            setEditable: function (td) {

                if (!td.parents) {
                    td = $(td.target).closest('td');
                }

                td.addClass('edited');

                if (this.isEditRows()) {
                    this.setChangedValue();
                }

                return false;
            },

            keyDown: function (e) {
                if (e.which === 13) {
                    this.setChangedValueToModel();
                }
            },

            setChangedValueToModel: function () {
                var editedElement = this.$el.find('.editing');
                var editedCol;
                var editedElementRow;
                var editedElementRowId;
                var editedElementContent;
                var editedElementValue;
                var editModel;
                var editedElementOldValue;
                var changedAttr;
                var differenceAmount;

                var calc;
                var paid;

                var differenceBettwenValues;

                if (editedElement.length) {
                    editedCol = editedElement.closest('td');
                    editedElementRow = editedElement.closest('tr');
                    editedElementRowId = editedElementRow.attr('data-id');
                    //editedElementContent = editedCol.data('content');
                    editedElementOldValue = parseInt(editedElement.attr('data-cash'));

                        editedElementValue = parseInt(editedElement.val());
                        editedElementValue = isFinite(editedElementValue) ? editedElementValue : 0;

                        editedElementOldValue = isFinite(editedElementOldValue) ? editedElementOldValue : 0;

                        differenceBettwenValues = editedElementValue - editedElementOldValue;

                    if (differenceBettwenValues !== 0) {

                        editModel = this.editCollection.get(editedElementRowId);

                        if (!this.changedModels[editedElementRowId]) {
                            if (!editModel.id) {
                                this.changedModels[editedElementRowId] = editModel.attributes;
                            } else {
                                this.changedModels[editedElementRowId] = {};
                            }
                        }

                        differenceAmount = _.clone(editModel.get('differenceAmount'));
                        paid = _.clone(editModel.get('paidAmount'));

                        changedAttr = this.changedModels[editedElementRowId];

                        if (changedAttr) {
                           if (editedCol.hasClass('paid')) {
                                if (!changedAttr.paidAmount) {
                                    changedAttr.paidAmount = paid;
                                }

                                paid = editedElementValue;
                                changedAttr['paidAmount'] = paid;
                                changedAttr['differenceAmount'] = paid - differenceAmount;
                            }
                        }
                    }

                    editedElement.remove();
                }
            },

            pay: function () {
                this.saveItem();

                this.removeDialog();

                Backbone.history.fragment = '';
                Backbone.history.navigate("#easyErp/PayrollPayments/list", {trigger: true});

            },

            removeDialog: function(){
                $(".edit-dialog").remove();
                $(".add-group-dialog").remove();
                $(".add-user-dialog").remove();
                $(".crop-images-dialog").remove();
            },

            render: function (options) {
                options.currencySplitter = helpers.currencySplitter;
                var formString = this.template(options);
                var self = this;

                this.$el = $(formString).dialog({
                    closeOnEscape: false,
                    autoOpen     : true,
                    resizable    : true,
                    dialogClass  : "edit-dialog",
                    title        : "Create Payment",
                    width        : "900px",
                    buttons      : [
                        {
                            id   : "payButton",
                            text: "Pay",
                            click: function () {
                                self.pay();
                            }
                        },

                        {
                            text : "Cancel",
                            click: function () {
                                self.removeDialog();
                            }
                        }]

                });

                this.delegateEvents(this.events);

                return this;
            }

        });

        return CreateView;
    });