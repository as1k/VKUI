import React, { HTMLAttributes, ReactNode, Component, ReactElement } from 'react';
import getClassName from '../../helpers/getClassName';
import classNames from '../../lib/classNames';
import { HasChildren, HasPlatform } from '../../types';
import withPlatform from '../../hoc/withPlatform';
import { ScrollSaver } from './ScrollSaver';

export interface EpicProps extends HTMLAttributes<HTMLDivElement>, HasChildren, HasPlatform {
  tabbar: ReactNode;
  activeStory: string;
}

class Epic extends Component<EpicProps> {
  readonly scroll: { [key: string]: number } = {};

  render() {
    const { className, activeStory, tabbar, children, platform, ...restProps } = this.props;

    const story = (React.Children.toArray(children) as ReactElement[]).find((story) => story.props.id === activeStory);
    return (
      <div {...restProps} className={classNames(getClassName('Epic', platform), className)}>
        <ScrollSaver
          key={activeStory}
          initialScroll={this.scroll[activeStory]}
          saveScroll={(value) => this.scroll[activeStory] = value}
        >{story}</ScrollSaver>
        {tabbar}
      </div>
    );
  }
}

export default withPlatform(Epic);
