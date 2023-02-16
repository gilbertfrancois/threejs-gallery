import { useCallback, useEffect, useState } from "react";
import { Sketch } from "./sketch";

export function App() {
    const [sliderValue, setSliderValue] = useState(20);
    const [isPaused, setIsPaused] = useState(false);
    return (
        <>
            <div className="controls">
                <div className="label-control-grid">
                    <div className="label-control-grid-item">
                        <button
                            id="goto_blitzblit"
                            type="button"
                            onClick={() => window.location.href='https://www.blitzblit.com'}
                        >Go to BLiTzBLiT
                        </button>
                    </div>
                </div>
            </div>
            <ThreeSketch
                paused={isPaused}
                sliderValue={sliderValue}
                className="sketch"
            />
        </>
    );
}

function ThreeSketch({ paused, sliderValue, className }) {
    const [sketch, setSketch] = useState();

    // Scene constructor
    const nodeRef = useCallback((node) => {
        if (node !== null) {
            setSketch(new Sketch({ dom: node }));
        }
    }, []);

    // Scene destructor
    useEffect(() => {
        if (!sketch) {
            return;
        }
        return () => {
            sketch.destroy();
        };
    }, [sketch]);

    // Passes state from React app to Sketch object.
    useEffect(() => {
        if (!sketch) {
            return;
        }
        if (paused) {
            sketch.stop();
        } else {
            sketch.play();
        }
    }, [paused, sketch]);

    return <div ref={nodeRef} className={className} />;
}
