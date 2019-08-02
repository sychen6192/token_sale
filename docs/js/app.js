App = {
	web3Provider:null,
	contracts: {},
	account: '0x0',
	loading: false,
	tokenPrice: 1000000000000000,
	tokensSold: 0,
	tokensAvailable: 750000,

	init: function() {
		console.log("App initialized...")
		return App.initWeb3();
	},

	initWeb3: function() {
		if (typeof web3 !== 'undefined') {
			App.web3Provider = web3.currentProvider;
			web3 = new Web3(web3.currentProvider);
		} else {
			App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
			web3 = new Web3(App.web3Provider);
			alert('請至Chrome擴充功能安裝Metamask!\nhttps://metamask.io/');
		}


		return App.initContracts();
	},

	initContracts: function() {
		$.getJSON("DappTokenSale.json", function(dappTokenSale) {
		  App.contracts.DappTokenSale = TruffleContract(dappTokenSale);
		  App.contracts.DappTokenSale.setProvider(App.web3Provider);
		  App.contracts.DappTokenSale.deployed().then(function(dappTokenSale) {
		  	// address 須小寫
		  	console.log("Dapp Token Sale Address:", dappTokenSale.address);
		  });
		}).done(function() {
		  	$.getJSON("DappToken.json", function(dappToken) {
	  		App.contracts.DappToken = TruffleContract(dappToken);
	    	App.contracts.DappToken.setProvider(App.web3Provider);
	  		App.contracts.DappToken.deployed().then(function(dappToken) {
	  		console.log("Dapp Token Address:", dappToken.address);
		  	});
		  	App.listenForEvents();
		  	return App.render();
		  });
		})
	},



	listenForEvents: function() {
		App.contracts.DappTokenSale.deployed().then(function(instance) {
			instance.Sell({}, {
				fromBlock: 0,
				toBlock: 'latest',
			}).watch(function(error, event) {
				console.log("event triggered", event);
				App.render();
			})
		})
	},

	render: function() {
		if (App.loading) {
			return;
		}
		App.loading = true;

		var loader  = $('#loader');
		var content = $('#content');

		loader.show();
		content.hide();
		// load account data
		web3.eth.getCoinbase(function(err, account) {
			if(err === null) {
				App.account = account;
				$('#accountAddress').html("你的以太幣公鑰: " + account);
			}
		})


		// Load token sale contract
		App.contracts.DappTokenSale.deployed().then(function(instance) {
			dappTokenSaleInstance = instance;
			return dappTokenSaleInstance.tokenPrice();
		}).then(function(tokenPrice) {
			// 問題是現在根本沒讀到contract 的 price ///..
			App.tokenPrice = tokenPrice.toNumber();
			$('.token-price').html(web3.fromWei(App.tokenPrice, "ether"));
			return dappTokenSaleInstance.tokensSold();
		}).then(function(tokensSold) {
			App.tokensSold = tokensSold.toNumber();
			$('.tokens-sold').html(App.tokensSold);
			$('.tokens-available').html(App.tokensAvailable);

			var progressPercent = (Math.ceil(App.tokensSold) / App.tokensAvailable) * 100;
			// console.log(progressPercent)
			$('#progress').css('width',progressPercent +'%');

			// Load token contract
			App.contracts.DappToken.deployed().then(function(instance) {
				dappTokenInstance = instance;
				return dappTokenInstance.balanceOf(App.account);
			}).then(function(balance) {
				$('.dapp-balance').html(balance.toNumber())
				App.loading = false;
				loader.hide();
				content.show();
			})
		})

	},

	buyTokens: function() {
		$('#content').hide();
		$('#loader').show();
		var numberOfToken = $('#numberOfToken').val();
		App.contracts.DappTokenSale.deployed().then(function(instance) {
			return instance.buyTokens(numberOfToken, {
				from: App.account,
				value: numberOfToken * App.tokenPrice,
				gas: 500000
			});
		}).then(function(result) {
			console.log("Tokens bought...")
			$('form').trigger('reset') // reset number of tokens in form
			// WAIT FOR SALE EVENT
		})
	}
}

$(function() {
	$(window).load(function() {
		App.init();
	})
});