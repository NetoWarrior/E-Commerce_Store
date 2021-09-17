import { useStripe } from '@stripe/react-stripe-js';
import React,{ useState, useEffect} from 'react'
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';

import {Products, Navbar, Cart, Checkout} from './components';


import {commerce} from './lib/commerce'

const App = () => {
    const [products, setProducts] = useState([])
    const [cart, setCart] = useState({})
    const [order, setOrder] = useState({})
    const [errorMessage, setErrorMessage] = useState('')

    const fetchProducts = async () => {
        const { data } = await commerce.products.list();

        setProducts(data);
    }

    const fetchCart = async () => {
        setCart(await commerce.cart.retrieve())
    }

    const handleAddToCart = async(productId, quantity) => {
        const {cart} = await commerce.cart.add(productId, quantity);

        setCart(cart);
    }

    const handleUpdateCartQty = async(productId, quantity) => {
        const {cart} = await commerce.cart.update(productId, { quantity });

        setCart(cart);
    }

    const handleRemoveFromCart = async(productId) => {
        const {cart} = await commerce.cart.remove(productId);

        setCart(cart)
    }

    const handleEmptyCart = async() => {
        const {cart} = await commerce.cart.empty();

        setCart(cart);
    }

    const refreshCart = async () => {
        const newCart = await commerce.cart.refresh();
        setCart(newCart);
    }

    const handleOrderCaptured = () => {
        alert('Order placed!');
    };

    const handleOrderCaptureFailed = (error) => {
        console.log('order_capture_failed')
        console.log(error);
    };

    const handleCaptureCheckout = async(checkoutTokenId, newOrder, stripe) => {
        try{
            const incomingOrder = await commerce.checkout.capture(checkoutTokenId, newOrder)
            console.log({incomingOrder})
            // setOrder(incomingOrder);
            // refreshCart();

        }catch(response){
            // if(error.data.error.type === 'requires_verification'){
            //     console.log(error.data.error.param);
                // stripe.handleCardAction(error.data.error.param)
                //     .then( result => {
                //         if(result.error){
                //             const err = result.error;
                //             console.log({err})
                //             handleOrderCaptureFailed(result.error);
                //         }

                //         commerce.checkout.capture(checkoutTokenId, newOrder)
                //             .then((res)=>{
                //                 handleOrderCaptured();
                //                 setOrder(res);
                //                 refreshCart();
                //             })
                //             .catch(handleOrderCaptureFailed)
                //     })
            
            // } else {
                
            //     handleOrderCaptureFailed(error)
            // }
            // console.log({error});
            // setErrorMessage(error.data.error.message);
            if (response.statusCode !== 402 || response.data.error.type !== 'requires_verification') {
                // Handle the error as usual because it's not related to 3D secure payments
                console.log(response);
                return;
            }

            const cardActionResult = await stripe.handleCardAction(response.data.error.param)

            if (cardActionResult.error) {
                // The customer failed to authenticate themselves with their bank and the transaction has been declined
                alert(cardActionResult.error.message);
                return;
            }

            const {list_items, customer, shipping, fulfillment} = newOrder;
            console.log({list_items, customer, shipping, fulfillment});

            try {
                const order = await commerce.checkout.capture(checkoutTokenId, {
                    list_items,
                    customer, 
                    shipping,
                    fulfillment,
                  payment: {
                    gateway: 'stripe',
                    stripe: {
                      payment_intent_id: cardActionResult.paymentIntent.id,
                    },
                  },
                });
            
                // If we get here the order has been captured successfully and the order detail is available in the order variable
                console.log(order);
                setOrder(order);
                refreshCart();
                return;
              } catch (response) {
                // Just like above, we get here if the order failed to capture with Commrece.js
                console.log(response);
                alert(response.message);
              }
        }
    }

    useEffect(() => {
       fetchProducts();
       fetchCart();
    }, [])

    // console.log({cart})

    return (
        <Router>
            <div>
                <Navbar totalItems={cart.total_items}/>
                <Switch>
                    <Route exact path="/" >
                        <Products products={products} onAddToCart={handleAddToCart} />
                    </Route>
                    <Route exact path="/cart" >
                        <Cart 
                            cart={cart} 
                            handleEmptyCart={handleEmptyCart}
                            handleRemoveFromCart={handleRemoveFromCart}
                            handleUpdateCartQty={handleUpdateCartQty}
                        />
                    </Route>
                    <Route exact path="/checkout">
                        <Checkout cart={cart} order={order} onCaptureCheckout={handleCaptureCheckout} error={errorMessage} />
                    </Route>
                </Switch>
            </div>
        </Router>
        
    )
}

export default App
