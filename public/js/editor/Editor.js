define(['jquery', 'lodash', 'util/Templater', 'api/Exceptions', 'editor/Model'],
    function($, _, Templater, Exceptions, Model) {
        var Editor = Class.create({
            initialize: function (api, modelId) {
                var self = this;
                this.api = api;

                this._loadTemplates();

                this._questionTypes = [
                    {
                        value: "choice",
                        text: "Выбор"
                    },
                    {
                        value: "number",
                        text: "Число"
                    }
                ];
                
                this._orderOps = [
                    {value: "==", text: "=="},
                    {value: ">", text: ">"},
                    {value: "<", text: "<"},
                    {value: ">=", text: ">="},
                    {value: "<=", text: "<="},
                    {value: "!=", text: "!="}
                ];

                if (!modelId) {
                    this._initialize();
                } else {
                    this.api.loadModel(modelId, {
                        onComplete: function (msg) {
                            self._initialize(msg.model)
                        },
                        onError: function (msg) {
                            alert(JSON.stringify(msg));
                        }
                    })
                }
            },

            _initialize: function (modelData) {
                var self = this;
                this._model = new Model(modelData);

                var $saveButton = $(".save-model");
                $saveButton.click(this._onSaveModelClick.bind(this));

                // render questions
                this.$questionsTable = $('#questions-table');
                var questions = this._model.getQuestions();
                _.each(questions, function (question) {
                    this.addQuestionRow(questions, question);
                }, this);

                var $addQuestionButton = $('#add-question');
                $addQuestionButton.click(function () {
                    var question = self._model.createQuestion();
                    self.addQuestionRow(questions, question);
                });

                // render orders
                this.$ordersTable = $('#orders-table');
                var orders = this._model.getOrders();
                _.each(orders, function (order) {
                    this.addOrderRow(orders, order);
                }, this);

                var $addOrderButton = $('#add-order');
                $addOrderButton.click(function () {
                    var order = self._model.createOrder();
                    self.addOrderRow(orders, order);
                });
                
                // render attributes
                this.$attrbutesTable = $('#attributes-table');
                var attributes = this._model.getAttributes();
                _.each(attributes, function (question) {
                    this.addAttributeRow(attributes, question);
                }, this);

                var $addAttributeButton = $('#add-attribute');
                $addAttributeButton.click(function () {
                    var attribute = self._model.createAttribute();
                    self.addAttributeRow(attributes, attribute);
                });

                // render derivation rules
                this.$rulesTable = $('#rules-table');
                var rules = this._model.getRules();
                _.each(rules, function (rule) {
                    this.addRuleRow(rules, rule);
                }, this);

                var $addRuleButton = $('#add-rule');
                $addRuleButton.click(function () {
                    var rule = self._model.createRule();
                    self.addRuleRow(rules, rule);
                });

                // model name
                var $modelName = $('#model-name');
                $modelName.val(this._model.getName());

                $modelName.on('input', function () {
                    var name = $modelName.val();
                    self._model.setName(name);
                });

                // manage objects
                var $manageObjects = $('#manage-objects');
                $manageObjects.click(this._onManageObjectsClick.bind(this));
            },

            _onManageObjectsClick: function () {
                console.log("Model: ", this._model.getData());

                var method = this.api.createModel.bind(this.api);
                if (this._model.getId() != null)
                    method = this.api.saveModel.bind(this.api);

                method(this._model.getData(), {
                    onComplete: function (msg) {
                        var modelId = msg._id;

                        history.replaceState(null, "", "/editor?modelId=" + modelId);
                        alert("Model saved successfully: " + modelId);
                        document.location.href = "/objectsManager?modelId=" + modelId;
                    },
                    onError: function (msg) {
                        alert(JSON.stringify(msg));
                    }
                });
            },

            _onSaveModelClick: function () {
                var self = this;

                console.log("Model: ", this._model.getData());

                var method = this.api.createModel.bind(this.api);
                if (this._model.getId() != null)
                    method = this.api.saveModel.bind(this.api);

                method(this._model.getData(), {
                    onComplete: function (msg) {
                        var modelId = msg._id;

                        history.replaceState(null, "", "/editor?modelId=" + modelId);
                        self._model.setId(modelId);

                        alert("Model saved successfully: " + modelId);
                    },
                    onError: function (msg) {
                        alert(JSON.stringify(msg));
                    }
                });
            },

            addQuestionRow: function (questions, question) {
                var context = _.extend(this._prepareContext(question));
                context.type = this._prepareSelect(this._questionTypes, question.type, "type");

                this.addRow(this.$questionsTable, this._templates.questionRow, context, questions, question);
            },

            //TODO
            addOrderRow: function (orders, order) {
                var context = {
                    from: this._prepareSelect(this._prepareQuestionList(), order.from, "from"),
                    op: this._prepareSelect(this._orderOps, order.op, "op"),
                    value: this._prepareSelect(this._prepareValues(order.from), order.value, "value"),
                    to: this._prepareSelect(this._prepareQuestionList(), order.to, "to")
                };

                this.addRow(this.$ordersTable, this._templates.orderChoiceRow, context, orders, order);
            },

            addAttributeRow: function (attributes, attribute) {
                var context = _.extend(this._prepareContext(attribute), {
                    type: this._prepareSelect(this._questionTypes, attribute.type)
                });

                this.addRow(this.$attrbutesTable, this._templates.attributeRow, context, attributes, attribute);
            },

            addRuleRow: function (rules, rule) {
                var context = this._prepareContext({
                    rule: rule
                });

                this.addRow(this.$rulesTable, this._templates.ruleRow, context, rules, rule);
            },

            /**
             * Adds <tr> in $table
             * @param $table {jQuery}
             * @param template {Function}
             * @param context {Object} template parameters
             * @param rows {Array} collection, which contains row
             * @param row {Object}
             */
            addRow: function ($table, template, context, rows, row) {
                var self = this;

                var questionRow = template(context);
                var $questionRow = $(questionRow);

                var $fields = $questionRow.find('input, select');
                $fields.on('input', function () {
                    var $field = $(this);
                    var key = $field.data('field');
                    var value = $field.val();

                    if (key == "values")
                        value = value.split(',');

                    console.log("Field changed: ", key, value);
                    row[key] = value;
                });

                var $removeButton = $questionRow.find('.remove');
                $removeButton.click(function () {
                    rows.remove(row);
                    $questionRow.fadeOut($questionRow.remove.bind($questionRow));
                });

                $table.append($questionRow);
            },

            _prepareContext: function (context) {
                return _.mapValues(context, function (value, key) {
                    return {
                        value: value,
                        field: key
                    };
                });
            },

            _prepareSelect: function (entries, selectedValue, fieldName) {
                entries = _.map(_.cloneDeep(entries), function (entry) {
                    if (entry.value == selectedValue)
                        entry.selected = "selected";

                    return entry;
                });

                return {
                    field: fieldName,
                    entries: entries
                };
            },

            _prepareQuestionList: function () {
                var questions = this._model.getQuestions();
                return _.map(questions, function (question) {
                    return {
                        value: question.param,
                        text: question.text
                    }
                });
            },

            _prepareValues: function (param) {
                var question = _.find(this._model.getQuestions(), function (question) {
                    return question.param == param;
                });
                var values = question.values;

                return _.map(values, function (value) {
                    return {
                        value: value,
                        text: value
                    }
                });
            },

            _loadTemplates: function () {
                this._partials = {
                    input: Templater.load('#input-template'),
                    select: Templater.load('#select-template'),
                    combobox: Templater.load('#combobox-template'),
                    operate: Templater.load('#operate-template'),
                };

                Templater.registerPartials(this._partials);

                this._templates = {
                    questionRow: Templater.load('#question-row-template'),
                    attributeRow: Templater.load('#attribute-row-template'),
                    ruleRow: Templater.load('#rule-row-template'),
                    orderChoiceRow: Templater.load('#order-choice-row-template'),
                    orderInputRow: Templater.load('#order-input-row-template')
                };
            }
        });
    
        return Editor;
    }
);