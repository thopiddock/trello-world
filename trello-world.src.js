var script = document.createElement('script');
script.onload = function() {

    var _boards = new Array();
    var _lists = new Array();
    var _cards = new Array();
    var _tokens = new Array();
    var _webhooks = new Array();

    //
    // Handle debug output
    //
    var debug = function(msg) {
        console.log(msg);
    };

    //
    // Handle error output
    //
    var error = function(msg) {
        var syntaxHighlight = function(json) {
            if (typeof json != 'string') {
                json = JSON.stringify(json, undefined, 4);
            }
            json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function(match) {
                var cls = 'number';
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) {
                        cls = 'key';
                    } else {
                        cls = 'string';
                    }
                } else if (/true|false/.test(match)) {
                    cls = 'boolean';
                } else if (/null/.test(match)) {
                    cls = 'null';
                }
                return '<span class="' + cls + '">' + match + '</span>';
            });
        };

        console.error(syntaxHighlight(msg));
    };

    //
    // Run a success callback using the settings that provided it.
    //
    var runSuccess = function(settings) {
        if (settings.success !== undefined) {
            settings.success(settings);
        }
    }

    //
    // Run an error callback using the settings that provided it.
    //
    var runError = function(settings) {
        if (settings.error !== undefined) {
            settings.error(settings);
        }
        error(settings.errorMessage);
    }

    //
    // Gets all the boards the current user has access to.
    //
    var getBoards = function(settings) {
        debug("getBoards()");
        _boards = new Array();
        Trello.get("members/me/boards",
            function(boards) {
                _boards = boards;
                runSuccess(settings);
            },
            error);
    }

    //
    // Gets an individual board based on its unique id.
    //
    var getBoard = function(id) {
        debug("getBoard( '" + id + "' )");
        if (id != undefined) {
            for (index in _boards) {
                if (_boards[index].id == id) {
                    return _boards[index];
                }
            }
        }
        return undefined;
    }

    //
    // Gets all the lists.
    //
    var getLists = function(boardId, settings) {
        debug("getLists( " + boardId + " )");
        _lists = new Array();
        Trello.get(
            "boards/" + boardId + "/lists",
            function(lists) {
                _lists = _lists.concat(lists);
                runSuccess(settings);
            },
            function(error) {
                settings.errorMessage = error;
                runError(settings);
            })
    }

    //
    // Gets all the tokens the current user has access to.
    //
    var getTokens = function(settings) {
        debug("getTokens()");
        _tokens = new Array();
        Trello.get(
            "members/me/tokens?webhooks=true",
            function(tokens) {
                _tokens = tokens;
                runSuccess(settings);
            },
            error);
    }

    //
    // Gets all the webhooks the current user has access to.
    //
    var getWebhooks = function(settings) {
        debug("getWebhooks()");
        _webhooks = new Array();
        Trello.get("tokens/" + Trello.token() + "/webhooks",
            function(webhooks) {
                _webhooks = webhooks;
                runSuccess(settings);
            },
            error
        );
    }

    //
    // Creates a webhooks with a given description, callbackURL and idModel.
    //
    var createWebhook = function(settings) {
        debug("createWebhook()");
        if (settings.description === undefined ||
            settings.callbackURL === undefined ||
            settings.idModel === undefined) {
            error("You must supply required settings (idWebhook, callbackURL, idModel)");
            return;
        }
        Trello.post("webhooks/", {
                description: settings.description,
                callbackURL: settings.callbackURL,
                idModel: settings.idModel
            },
            function(webhookObject) {
                settings.webhookItem = generateWebhookItem(webhookObject);
                runSuccess(settings);
            },
            function(errorMessage) {
                settings.errorMessage = errorMessage;
                runError(settings);
            })
    }

    //
    // Updates the webhook using an ID.
    //
    var updateWebhook = function(settings) {
        debug("editWebhook()");
        if (settings.idWebhook === undefined ||
            settings.description === undefined ||
            settings.callbackURL === undefined ||
            settings.idModel === undefined) {
            error("You must supply required settings (idWebhook, description, callbackURL, idModel)");
            return;
        }
        Trello.put(
            "webhooks/" + settings.idWebhook, {
                description: settings.description,
                callbackURL: settings.callbackURL,
                idModel: settings.idModel
            },
            getTokens({
                success: function() {
                    var webhookListItem = $("li[data-id=" + settings.idWebhook + "]");
                    webhookListItem.attr("data-description", settings.description);
                    webhookListItem.attr("data-callbackURL", settings.callbackURL);
                    webhookListItem.attr("data-idModel", settings.idModel);
                    runSuccess(settings);
                }
            }),
            error);
    }

    //
    // Deletes the webhook using an ID.
    //
    var deleteWebhook = function(settings) {
        debug("deleteWebhook()");
        if (settings.idWebhook === undefined) {
            error("You must supply required settings (idWebhook)");
            return;
        }
        Trello.del(
            "webhooks/" + settings.idWebhook, {},
            getWebhooks({
                success: function() {
                    $(".webhook-list-item[data-id=" + settings.idWebhook + "]").remove();
                    runSuccess(settings);
                }
            }),
            error);
    }

    //
    // Sets the webhook as active, using an ID.
    //
    var setWebhookActive = function(settings) {
        debug("setWebhookActive()");
        if (settings.idWebhook === undefined ||
            settings.active === undefined) {
            error("You must supply required settings (idWebhook, active)");
            return;
        }
        Trello.put("webhooks/" + settings.idWebhook + "/active", {
                value: settings.active
            },
            function() {
                runSuccess(settings);
            },
            function(errorMessage) {
                settings.errorMessage = errorMessage;
                runError(settings);
            });
    }

    var generateWebhookItem = function(webhookObject) {

        // Parent Items
        var webhookListItem, webhookDisplay, webhookEdit, toggleEdit;
        // Display Items
        var descriptionPara, callbackPara, editButton, removeButton, buttonsDiv;
        // Edit Items
        var descriptionInput, callbackURLInput, saveButton, cancelButton, editButtonsDiv;

        // Parent Items
        webhookListItem = $(
            "<div></div>", {
                class: "webhook-list-item",
                "data-id": webhookObject.id,
                "data-idModel": webhookObject.idModel,
                "data-description": webhookObject.description,
                "data-callbackURL": webhookObject.callbackURL,
                "data-active": webhookObject.active,
                "data-editmode": false
            });
        webhookDisplay =
            $("<div></div>", {
                class: "webhook-display"
            });
        webhookEdit =
            $("<form></form>", {
                class: "webhook-edit form-group",
                style: "display:none;"
            }).on('reset', function(events) {
                events.preventDefault();
                $(this).get(0).reset();
                toggleEdit();
            }).submit(function(events) {
                debug("submitted");
                updateWebhook({
                    idWebhook: webhookObject.id,
                    description: descriptionInput.val(),
                    callbackURL: callbackURLInput.val(),
                    idModel: webhookObject.idModel,
                    success: function() {
                        rebuildDisplay();
                        toggleEdit();
                        rebuildForm();
                    }
                });
                events.preventDefault();
            });

        toggleEdit = function() {
            var listItem = webhookListItem;
            var display = webhookDisplay;
            var edit = webhookEdit;
            var isTrue = listItem.attr("data-editmode") === 'true';
            listItem.attr("data-editmode", !isTrue);
            isTrue = listItem.attr("data-editmode") === 'true';
            if (isTrue) {
                display.slideUp(function() {
                    edit.slideDown();
                });
            } else {
                edit.slideUp(function() {
                    display.slideDown();
                });
            }
            debug(listItem.attr("data-id") + " set to edit-mode: " + isTrue);
        }

        var rebuildDisplay = function() {
            // Main Display
            descriptionPara =
                $("<h3></h3>", {
                    name: "description",
                    text: webhookListItem.attr("data-description")
                });
            callbackPara =
                $("<p></p>", {
                    name: "callbackURL",
                    text: "[" + webhookListItem.attr("data-callbackURL") + "]"
                });
            editButton =
                $("<button></button>", {
                    text: "Edit",
                    class: "btn btn-secondary",
                    "data-id": webhookListItem.attr("data-id")
                }).click(function() {
                    toggleEdit();
                });
            removeButton =
                $("<button></button>", {
                    text: "Remove",
                    class: "btn",
                    "data-id": webhookListItem.attr("data-id")
                }).btsConfirmButton({
                    msg: "Confirm?",
                    timeout: 3000,
                    className: 'btn-danger'
                }, function() {
                    deleteWebhook({
                        idWebhook: $(this).attr("data-id")
                    });
                });
            buttonsDiv =
                $("<div></div>", {
                    class: "btn-group right"
                }).append(editButton)
                .append(removeButton);
            webhookDisplay
                .empty()
                .append(buttonsDiv)
                .append(descriptionPara)
                .append(callbackPara);
        }

        var rebuildForm = function() {
            // Edit Display
            descriptionInput =
                $("<input>", {
                    value: webhookListItem.attr("data-description"),
                    type: "text",
                    class: "form-control",
                    placeholder: "Enter webhook description"
                });
            callbackURLInput =
                $("<input>", {
                    value: webhookListItem.attr("data-callbackURL"),
                    type: "text",
                    class: "form-control",
                    placeholder: "Enter callback URL"
                });
            saveButton =
                $("<button></button>", {
                    text: "Save",
                    type: "submit",
                    class: "btn btn-primary",
                });
            cancelButton =
                $("<button></button>", {
                    text: "Cancel",
                    type: "reset",
                    class: "btn btn-danger",
                });
            editButtonsDiv =
                $("<div></div>", {
                    class: "webhook-buttons btn-group"
                });

            editButtonsDiv
                .append(saveButton)
                .append(cancelButton);
            webhookEdit
                .empty()
                .append($("<fieldset>", {
                    class: "form-group"
                }).append(descriptionInput))
                .append($("<fieldset>", {
                    class: "form-group"
                }).append(callbackURLInput))
                .append($("<fieldset>", {
                    class: "form-group"
                }).append(editButtonsDiv));
        }

        // Build List Item
        rebuildForm();
        rebuildDisplay();
        webhookListItem
            .append(webhookDisplay)
            .append(webhookEdit);
        return webhookListItem;
    }

    var loadExistingWebhooks = function() {
        getWebhooks({
            success: function() {
                for (index in _webhooks) {
                    (function() {
                        var currentWebhookObject = _webhooks[index];
                        var webhookItem = generateWebhookItem(currentWebhookObject);
                        $("#trello-existing-webhooks").append(webhookItem);
                    })();
                };
            }
        });
    }

    var loadNewWebhookForm = function() {
        getBoards({
            success: function(webhook) {
                var surroundWithLabel = function(child, label) {
                    var parentObject = $("<label>", {
                        class: "form-control-label col-sm-7",
                        text: label
                    });
                    parentObject.append(child);
                    return parentObject;
                }
                var surroundWithFormGroup = function(child) {
                    var parentObject = $("<div>", {
                        class: "form-group"
                    });
                    parentObject.append(child);
                    return parentObject;
                }

                var newWebhookForm, buttonContainer;
                var selectTrelloBoards, selectTrelloLists, descriptionInput, callbackURLInput;
                var selectTrelloBoardsParent, selectTrelloListsParent, descriptionInputParent, callbackURLInputParent;

                var createWebhookButton, resetButton;

                newWebhookForm = $(
                    "<form></form>", {
                        style: "overflow: auto;"
                    });

                selectTrelloBoards = $("<select>", {
                    class: "form-control"
                }).change(function() {
                    changeBoard($(this).val(), selectTrelloLists);
                });

                selectTrelloLists = $("<select>", {
                    class: "form-control"
                });

                descriptionInput = $("<input>", {
                    type: "text",
                    class: "form-control",
                    placeholder: "Webhook description"
                });

                callbackURLInput = $("<input>", {
                    type: "text",
                    class: "form-control",
                    placeholder: "Webhook callback URL"
                });

                createWebhookButton = $("<button>", {
                    type: "submit",
                    class: "btn btn-primary",
                    text: "Create Webhook"
                })
                resetFormButton = $("<button>", {
                    type: "reset",
                    class: "btn btn-default",
                    text: "Reset"
                })


                for (index in _boards) {
                    selectTrelloBoards.append($("<option>", {
                        value: _boards[index].id,
                        text: _boards[index].name
                    }));
                }

                selectTrelloBoardsParent = surroundWithFormGroup(surroundWithLabel(selectTrelloBoards, "Boards"));
                selectTrelloListsParent = surroundWithFormGroup(surroundWithLabel(selectTrelloLists, "Lists"));
                descriptionInputParent = surroundWithFormGroup(surroundWithLabel(descriptionInput, "Description"));
                callbackURLInputParent = surroundWithFormGroup(surroundWithLabel(callbackURLInput, "Callback URL"));

                newWebhookForm
                    .append(selectTrelloBoardsParent)
                    .append(selectTrelloListsParent)
                    .append(descriptionInputParent)
                    .append(callbackURLInputParent)
                    .append(
                        $("<div>", {
                            class: "form-group col-sm-7 btn-group"
                        })
                        .append(createWebhookButton)
                        .append(resetFormButton))
                    .submit(function(event) {
                        createWebhook({
                            description: descriptionInput.val(),
                            callbackURL: callbackURLInput.val(),
                            idModel: selectTrelloLists.val(),
                            success: function(settings) {
                                $("#trello-existing-webhooks").append(settings.webhookItem);
                            },
                            error: function(settings) {
                                if (settings.error !== undefined) {
                                    // Unknown Error occurred.
                                }
                            }
                        });
                        event.preventDefault();
                    });
                $("#trello-new-webhook")
                    .append(newWebhookForm);

                changeBoard(selectTrelloBoards.val(), selectTrelloLists);
            }
        });
    }

    //
    // The change board event handler
    //
    var changeBoard = function(boardId, childSelect) {
        debug("changeBoard( " + boardId + " )");
        childSelect.prop("disabled", true);
        $("#loading").show();
        getLists(boardId, {
            success: function() {
                childSelect.find("*").remove();
                for (index in _lists) {
                    if (_lists[index].idBoard == boardId) {
                        childSelect.append($("<option>", {
                            value: _lists[index].id,
                            text: _lists[index].name
                        }));
                    }
                }
                childSelect.prop("disabled", false);
                $("#loading").hide();
            },
            error: function() {
                $("#loading").hide();
            }
        });
    }

    //
    // Initialise the trello world interface.
    //
    var intialise = function() {
        debug("intialise()");
        $("#loading").show();

        $.when(loadNewWebhookForm(), loadExistingWebhooks()).done(function() {
            $("#loading").hide();
            $("#trello-new-webhook").show(0, '', function() {
                $("#trello-existing-webhooks").show();
            });
        })
    }

    $(function() {
        intialise();
    });
}

// Override with trello-world-config.dev.js so developers can use a config file that isn't committed to version control.
$.ajax({
    url: 'trello-world-config.dev.js',
    type: 'HEAD',
    error: function() {
        if (trelloWorldConfig.key === "" ||
            trelloWorldConfig.token === "") {
            var warning = document.createElement('div');
            warning.innerText = "The Key or Token has not been set and we couldn't find a developer configuration. You need to set your Key and Token in trello-world-config.js!"
            warning.className = "text-danger"
            document.body.appendChild(warning);
            $("#loading").hide();
        } else {
            script.src = "https://trello.com/1/client.js?key=" + trelloWorldConfig.key + "&token=" + trelloWorldConfig.token;
            document.body.appendChild(script);
        }
    },
    success: function() {
        //file exists
        var devscript = document.createElement('script');
        devscript.src = "trello-world-config.dev.js";
        devscript.onload = function() {
            console.debug("Key:   " + trelloWorldConfig.key);
            console.debug("Token: " + trelloWorldConfig.token);
            script.src = "https://trello.com/1/client.js?key=" + trelloWorldConfig.key + "&token=" + trelloWorldConfig.token;
            document.body.appendChild(script);
        };
        document.body.appendChild(devscript);
    }
});